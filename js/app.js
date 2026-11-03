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

async function githubFetch(path) {
  const cacheKey = `gh_cache:${path}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { ts, data } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
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
    throw new Error(`GitHub API error ${res.status} su ${path}`);
  }

  const data = await res.json();
  sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
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

function pickPrimaryAsset(release, pattern) {
  if (!release || !release.assets || release.assets.length === 0) return null;
  if (pattern) {
    const re = new RegExp(pattern, "i");
    const match = release.assets.find((a) => re.test(a.name));
    if (match) return match;
  }
  return release.assets[0];
}

function sumDownloads(releases) {
  return releases.reduce((total, r) => {
    return total + (r.assets || []).reduce((s, a) => s + (a.download_count || 0), 0);
  }, 0);
}

/* ---------- Rendering ---------- */

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { year: "numeric", month: "short", day: "numeric" });
}

function renderAssetList(release) {
  if (!release.assets || release.assets.length === 0) {
    return `<p class="hint">Nessun asset binario allegato a questa release.</p>`;
  }
  return `<div class="asset-list">${release.assets
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

function renderAppCard(appConfig, releases) {
  const template = document.getElementById("app-card-template");
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".app-card");

  card.querySelector(".app-icon").src = appConfig.icon || "";
  card.querySelector(".app-icon").alt = appConfig.displayName;
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
  card.querySelector(".app-icon").src = appConfig.icon || "";
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
        return renderErrorCard(appConfig, "Impossibile caricare le release per questa app.");
      }
    })
  );

  grid.innerHTML = "";
  cards.forEach((card) => grid.appendChild(card));
}

document.addEventListener("DOMContentLoaded", init);
