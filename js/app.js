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

function readCache(cacheKey) {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return null;
    const { ts, data } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
  } catch {
    // Cache corrotta o non disponibile: ignora e ricarica dalla rete.
  }
  return null;
}

function writeCache(cacheKey, data) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // sessionStorage può rifiutare scritture troppo grandi (QuotaExceededError)
    // o essere disabilitato (es. navigazione privata): la cache è solo
    // un'ottimizzazione, un fallimento qui non deve bloccare il caricamento.
  }
}

async function githubFetch(path) {
  const cacheKey = `gh_cache:${path}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

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
    const err = new Error(`GitHub API error ${res.status} su ${path}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  writeCache(cacheKey, data);
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

async function loadReleasesForApp(appConfig) {
  const { owner, repo } = appConfig;
  let releases = [];
  let page = 1;
  // Fino a 300 release (3 pagine da 100): sufficiente per uso personale.
  while (page <= 3) {
    const batch = await githubFetch(`/repos/${owner}/${repo}/releases?per_page=100&page=${page}`);
    releases = releases.concat(batch);
    if (batch.length < 100) break;
    page += 1;
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

function renderAssetList(release) {
  const assets = getPackageAssets(release);
  if (assets.length === 0) {
    return `<p class="hint">Nessun pacchetto allegato a questa release.</p>`;
  }
  return `<div class="asset-list">${assets
    .map(
      (a) => `
      <a href="${a.browser_download_url}" target="_blank" rel="noopener">
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

function fallbackIconDataUri(name) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
    <rect width="48" height="48" rx="10" fill="#272b36"/>
    <text x="50%" y="52%" dy=".35em" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#9aa0ad">${initial}</text>
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
      downloadBtn.href = asset.browser_download_url;
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
        ${renderAssetList(r)}
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
          globalStatus.textContent = err.resetDate
            ? `Limite di richieste GitHub superato. Riprova dopo le ${err.resetDate.toLocaleTimeString("it-IT")}, oppure imposta un token nelle impostazioni (⚙️) per aumentare il limite.`
            : "Limite di richieste GitHub superato. Imposta un token nelle impostazioni (⚙️) per aumentare il limite.";
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
  cards.forEach((card) => grid.appendChild(card));
}

document.addEventListener("DOMContentLoaded", init);
