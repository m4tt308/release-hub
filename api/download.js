/**
 * Proxy di download: il bottone/i link della vetrina puntano qui invece che
 * direttamente a `browser_download_url`, così possiamo loggare chi scarica
 * (IP, asset, timestamp) prima di reindirizzare al vero file su GitHub.
 *
 * Accetta solo owner/repo/id (mai un URL arbitrario dal client): l'URL reale
 * dell'asset viene sempre richiesto a GitHub lato server, e owner/repo deve
 * comparire tra quelli configurati in js/config.js. Questo evita che l'endpoint
 * diventi un open redirect verso siti arbitrari.
 */

const APPS_CONFIG = require("../js/config.js");

function getAllowedRepoKeys() {
  const keys = new Set();
  for (const app of APPS_CONFIG) {
    const owner = app.releasesOwner || app.owner;
    const repo = app.releasesRepo || app.repo;
    keys.add(`${owner}/${repo}`);
  }
  return keys;
}

async function logDownload(entry) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Lo storage dei log è opzionale: se non configurato, il download funziona
  // comunque (si perde solo la tracciabilità).
  if (!url || !token) return;

  const key = "release-hub:downloads";
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["LPUSH", key, JSON.stringify(entry)],
        ["LTRIM", key, "0", "4999"] // mantiene solo gli ultimi 5000 download
      ])
    });
  } catch (err) {
    console.error("Impossibile scrivere il log di download:", err);
  }
}

module.exports = async (req, res) => {
  const { owner, repo, id } = req.query || {};

  if (!owner || !repo || !id || !/^\d+$/.test(String(id))) {
    res.status(400).send("Parametri mancanti o non validi.");
    return;
  }

  if (!getAllowedRepoKeys().has(`${owner}/${repo}`)) {
    res.status(403).send("Repository non consentito.");
    return;
  }

  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let asset;
  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/assets/${id}`,
      { headers }
    );
    if (!ghRes.ok) {
      res.status(404).send("Asset non trovato.");
      return;
    }
    asset = await ghRes.json();
  } catch (err) {
    res.status(502).send("Errore nel contattare GitHub.");
    return;
  }

  const ip =
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.socket?.remoteAddress ||
    "";

  // Non blocca il redirect in caso di errore di logging: il download per
  // l'utente ha sempre priorità sulla tracciabilità.
  await logDownload({
    ts: new Date().toISOString(),
    ip,
    owner,
    repo,
    assetId: asset.id,
    assetName: asset.name,
    ua: req.headers["user-agent"] || ""
  });

  res.writeHead(302, { Location: asset.browser_download_url });
  res.end();
};
