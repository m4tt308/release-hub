/**
 * Release Hub — vetrina statica che consuma le GitHub REST API.
 * Nessun backend: tutto avviene lato client nel browser dell'utente.
 */

const GITHUB_API = "https://api.github.com";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti
const TOKEN_STORAGE_KEY = "release_hub_gh_token";

/* ---------- Token GitHub (opzionale, solo client-side) ---------- */

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function setupSettingsPanel() {
  const toggle = document.getElementById("settings-toggle");
  const panel = document.getElementById("settings-panel");
  const input = document.getElementById("gh-token-input");
  const saveBtn = document.getElementById("gh-token-save");
  const clearBtn = document.getElementById("gh-token-clear");

  input.value = getToken();

  toggle.addEventListener("click", () => panel.classList.toggle("hidden"));

  saveBtn.addEventListener("click", () => {
    const value = input.value.trim();
    if (value) {
      localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    location.reload();
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    input.value = "";
    location.reload();
  });
}

/* ---------- Fetch con cache in sessionStorage e gestione rate limit ---------- */

// Durata della cache "negativa" per errori 404 (repo privato/inesistente per chi chiama):
// più lunga di quella dei dati, perché per un visitatore senza token non cambierà da un
// minuto all'altro, ed è proprio questa chiamata, destinata a fallire sempre, che altrimenti
// consuma inutilmente il limite di 60 richieste/ora condiviso da tutti quelli dietro lo
// stesso IP (es. un intero ufficio).
const NOT_FOUND_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minuti

function readCache(cacheKey) {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;
    const entry = JSON.parse(cached);
    const ttl = entry.errorStatus === 404 ? NOT_FOUND_CACHE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - entry.ts < ttl) return entry;
  } catch {
    // Cache corrotta o non disponibile: ignora e ricarica dalla rete.
  }
  return null;
}

function writeCache(cacheKey, entry) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), ...entry }));
  } catch {
    // sessionStorage può rifiutare scritture troppo grandi (QuotaExceededError)
    // o essere disabilitato (es. navigazione privata): la cache è solo
    // un'ottimizzazione, un fallimento qui non deve bloccare il caricamento.
  }
}

function throwCachedError(status) {
  const err = new Error(`GitHub API error ${status} (da cache)`);
  err.status = status;
  throw err;
}

async function githubFetch(path) {
  const cacheKey = `gh_cache:${path}`;
  const cached = readCache(cacheKey);
  if (cached) {
    if (cached.errorStatus) throwCachedError(cached.errorStatus);
    return cached.data;
  }

  const headers = { Accept: "application/vnd.github+json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, { headers });

  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const resetDate = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
    throw new RateLimitError(resetDate);
  }
  if (!res.ok) {
    // I 404 (repo privato/inesistente per chi chiama) vengono messi in cache più a lungo:
    // altrimenti ogni visitatore senza accesso spreca una richiesta ad ogni caricamento.
    if (res.status === 404) writeCache(cacheKey, { errorStatus: 404 });
    const err = new Error(`GitHub API error ${res.status} su ${path}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  writeCache(cacheKey, { data });
  return data;
}

class RateLimitError extends Error {
  constructor(resetDate) {
    super("GitHub API rate limit superato");
    this.resetDate = resetDate;
  }
}

/* ---------- Sanitizzazione minimale dell'HTML generato dal markdown ---------- */

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function renderMarkdown(md) {
  if (!md) return "<p><em>Nessuna descrizione.</em></p>";
  const raw = typeof marked !== "undefined" ? marked.parse(md) : md;
  return sanitizeHtml(raw);
}

/* ---------- Logica dati per singola app ---------- */

// Se è impostato releasesOwner/releasesRepo, i pacchetti vengono letti da lì (tipicamente
// un repo pubblico) invece che dal repo sorgente (owner/repo), che può restare privato.
// Sono le stesse coordinate usate da api/download.js per la whitelist del proxy di download.
function getReleasesCoords(appConfig) {
  return {
    owner: appConfig.releasesOwner || appConfig.owner,
    repo: appConfig.releasesRepo || appConfig.repo
  };
}

function buildDownloadUrl(coords, asset) {
  const params = new URLSearchParams({ owner: coords.owner, repo: coords.repo, id: asset.id });
  return `/api/download?${params.toString()}`;
}

async function loadReleasesForApp(appConfig) {
  const { owner, repo } = getReleasesCoords(appConfig);
  let releases = [];
  let page = 1;
  // Fino a 300 release (3 pagine da 100): sufficiente per uso personale.
  while (page <= 3) {
    const batch = await githubFetch(`/repos/${owner}/${repo}/releases?per_page=100&page=${page}`);
    releases = releases.concat(batch);
    if (batch.length < 100) break;
    page += 1;
  }

  // Quando più app condividono lo stesso releasesRepo, il tagPrefix isola le release di
  // questa app e lo toglie dalla versione mostrata (es. "mail-editor-v1.0.0" -> "v1.0.0").
  if (appConfig.tagPrefix) {
    releases = releases
      .filter((r) => r.tag_name.startsWith(appConfig.tagPrefix))
      .map((r) => ({ ...r, tag_name: r.tag_name.slice(appConfig.tagPrefix.length) }));
  }

  return releases;
}

function pickLatestRelease(releases, includePrerelease) {
  return releases.find((r) => includePrerelease || !r.prerelease) || null;
}

/**
 * Deve essere scaricabile SOLO il pacchetto compilato, mai il codice sorgente.
 * Per questo il sito legge esclusivamente `release.assets` (i file che carichi
 * manualmente/dalla CI su una Release) e non usa mai `zipball_url`/`tarball_url`
 * (gli archivi del sorgente generati automaticamente da GitHub per ogni release).
 * Questo filtro è una rete di sicurezza aggiuntiva nel caso un asset con quel
 * nome venga caricato per errore.
 */
function isSourceArchiveAsset(name) {
  return /^source[ _-]?code\b/i.test(name);
}

function getPackageAssets(release) {
  if (!release || !release.assets) return [];
  return release.assets.filter((a) => !isSourceArchiveAsset(a.name));
}

function pickPrimaryAsset(release, pattern) {
  const assets = getPackageAssets(release);
  if (assets.length === 0) return null;
  if (pattern) {
    const re = new RegExp(pattern, "i");
    const match = assets.find((a) => re.test(a.name));
    if (match) return match;
  }
  return assets[0];
}

function sumDownloads(releases) {
  return releases.reduce((total, r) => {
    return total + getPackageAssets(r).reduce((s, a) => s + (a.download_count || 0), 0);
  }, 0);
}

/* ---------- Rendering ---------- */

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { year: "numeric", month: "short", day: "numeric" });
}

function renderAssetList(release, coords) {
  const assets = getPackageAssets(release);
  if (assets.length === 0) {
    return `<p class="hint">Nessun pacchetto allegato a questa release.</p>`;
  }
  return `<div class="asset-list">${assets
    .map(
      (a) => `
      <a href="${buildDownloadUrl(coords, a)}" target="_blank" rel="noopener">
        <span>${escapeHtml(a.name)}</span>
        <span class="asset-dl-count">${a.download_count} download</span>
      </a>`
    )
    .join("")}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Coppie di colori in tema con lo sfondo ambientale (accent/accent-2/accent-3 di style.css):
// ogni app riceve sempre la stessa coppia (derivata dal nome), per un'icona
// riconoscibile e stabile tra un caricamento e l'altro, senza bisogno di un'icona vera.
const ICON_GRADIENTS = [
  ["#4f8cff", "#8b7bff"],
  ["#8b7bff", "#2dd4bf"],
  ["#2dd4bf", "#4f8cff"],
  ["#4f8cff", "#2dd4bf"]
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fallbackIconDataUri(name) {
  const label = (name || "?").trim();
  const initial = (label.charAt(0) || "?").toUpperCase();
  const hash = hashString(label);
  const [c1, c2] = ICON_GRADIENTS[hash % ICON_GRADIENTS.length];
  const gradId = `g${hash}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="22" fill="url(#${gradId})"/>
    <text x="50%" y="55%" dy=".35em" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="700" font-size="40" fill="#ffffff">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function applyIcon(card, appConfig) {
  const img = card.querySelector(".app-icon");
  const fallback = fallbackIconDataUri(appConfig.displayName);
  img.src = appConfig.icon || fallback;
  img.alt = appConfig.displayName;
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
}

function renderAppCard(appConfig, releases) {
  const template = document.getElementById("app-card-template");
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".app-card");

  applyIcon(card, appConfig);
  card.querySelector(".app-name").textContent = appConfig.displayName;
  card.querySelector(".app-description").textContent = appConfig.description || "";

  const coords = getReleasesCoords(appConfig);
  const totalDownloads = sumDownloads(releases);
  card.querySelector(".download-count").textContent = `⬇ ${totalDownloads.toLocaleString("it-IT")} download totali`;

  if (releases.length === 0) {
    card.querySelector(".latest-release").innerHTML =
      '<p class="card-skeleton">Nessuna release pubblicata ancora.</p>';
    card.querySelector(".changelog-details").remove();
    card.querySelector(".history-details").remove();
    return card;
  }

  const latest = pickLatestRelease(releases, appConfig.includePrerelease);

  if (latest) {
    card.querySelector(".version-badge").textContent = latest.tag_name;
    card.querySelector(".release-date").textContent = formatDate(latest.published_at);

    const asset = pickPrimaryAsset(latest, appConfig.primaryAssetPattern);
    const downloadBtn = card.querySelector(".download-btn");
    if (asset) {
      downloadBtn.href = buildDownloadUrl(coords, asset);
      downloadBtn.textContent = `⬇ Download ${asset.name}`;
    } else {
      downloadBtn.href = latest.html_url;
      downloadBtn.textContent = "⬇ Vedi release";
    }

    card.querySelector(".changelog-body").innerHTML = renderMarkdown(latest.body);
  } else {
    card.querySelector(".changelog-details").remove();
  }

  const historyList = card.querySelector(".history-list");
  card.querySelector(".history-count").textContent = releases.length;
  historyList.innerHTML = releases
    .map(
      (r) => `
      <div class="history-item">
        <div class="history-item-head">
          <span class="tag">${escapeHtml(r.tag_name)}</span>
          ${r.prerelease ? '<span class="prerelease-tag">pre-release</span>' : ""}
          <span>${formatDate(r.published_at)}</span>
        </div>
        <div class="history-changelog">${renderMarkdown(r.body)}</div>
        ${renderAssetList(r, coords)}
      </div>`
    )
    .join("");

  return card;
}

function renderErrorCard(appConfig, message) {
  const template = document.getElementById("app-card-template");
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".app-card");
  applyIcon(card, appConfig);
  card.querySelector(".app-name").textContent = appConfig.displayName;
  card.querySelector(".app-description").textContent = appConfig.description || "";
  card.querySelector(".latest-release").innerHTML = `<p class="card-error">${escapeHtml(message)}</p>`;
  card.querySelector(".changelog-details").remove();
  card.querySelector(".history-details").remove();
  return card;
}

/* ---------- Avvio ---------- */

async function init() {
  setupSettingsPanel();

  const grid = document.getElementById("apps-grid");
  const globalStatus = document.getElementById("global-status");

  grid.innerHTML = APPS_CONFIG.map(
    () => '<article class="app-card"><p class="card-skeleton">Caricamento…</p></article>'
  ).join("");

  const cards = await Promise.all(
    APPS_CONFIG.map(async (appConfig) => {
      try {
        const releases = await loadReleasesForApp(appConfig);
        return renderAppCard(appConfig, releases);
      } catch (err) {
        if (err instanceof RateLimitError) {
          globalStatus.classList.remove("hidden");
          const retry = err.resetDate
            ? `riprova dopo le ${err.resetDate.toLocaleTimeString("it-IT")}`
            : "riprova tra qualche minuto";
          globalStatus.textContent = `Troppe richieste a GitHub da questa rete (limite condiviso con chiunque la usi, non legato a questo visitatore): ${retry}. Se persiste, chi gestisce il sito può impostare un token nelle impostazioni (⚙️) per aumentare il limite.`;
        }
        console.error(`Errore nel caricamento di ${appConfig.owner}/${appConfig.repo}:`, err);
        const message =
          err.status === 404
            ? "Repository non trovato o privato: imposta un token con accesso a questo repo nelle impostazioni (⚙️)."
            : "Impossibile caricare le release per questa app.";
        return renderErrorCard(appConfig, message);
      }
    })
  );

  grid.innerHTML = "";
  // Ingresso "a cascata": ogni card parte con un piccolo ritardo in più della precedente
  // (letto da CSS via --card-delay), così l'animazione di comparsa non è tutta simultanea.
  cards.forEach((card, i) => {
    card.style.setProperty("--card-delay", `${Math.min(i * 70, 420)}ms`);
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", init);
