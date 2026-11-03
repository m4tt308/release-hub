/**
 * Visualizzatore dei log di download, protetto da ADMIN_TOKEN (variabile
 * d'ambiente). Uso: https://<tuo-sito>/api/logs?token=<ADMIN_TOKEN>
 * Aggiungi &format=json per la risposta grezza invece della tabella HTML.
 *
 * NB: il token passa come query string, quindi il link non va condiviso e
 * finisce nella history del browser di chi lo apre — accettabile per un uso
 * personale, ma non è un sistema di autenticazione robusto.
 */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.query?.token !== adminToken) {
    res.status(401).send("Non autorizzato.");
    return;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !redisToken) {
    res.status(500).send("Storage dei log non configurato (UPSTASH_REDIS_REST_URL/TOKEN mancanti).");
    return;
  }

  const key = "release-hub:downloads";
  const limit = Math.min(Number(req.query?.limit) || 200, 2000);

  let entries = [];
  try {
    const redisRes = await fetch(`${url}/lrange/${key}/0/${limit - 1}`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    const data = await redisRes.json();
    entries = (data.result || [])
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    res.status(502).send("Errore nel leggere i log.");
    return;
  }

  if (req.query?.format === "json") {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(entries, null, 2));
    return;
  }

  const rows = entries
    .map(
      (e) => `
      <tr>
        <td>${escapeHtml(e.ts)}</td>
        <td>${escapeHtml(e.ip)}</td>
        <td>${escapeHtml(e.owner)}/${escapeHtml(e.repo)}</td>
        <td>${escapeHtml(e.assetName)}</td>
        <td>${escapeHtml(String(e.ua || "").slice(0, 80))}</td>
      </tr>`
    )
    .join("");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Log download — Release Hub</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #14161c; color: #e4e6eb; padding: 2rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    td, th { padding: 0.4rem 0.6rem; border-bottom: 1px solid #2a2d36; text-align: left; white-space: nowrap; }
    th { color: #9aa0ad; }
  </style>
</head>
<body>
  <h1>Log download (${entries.length})</h1>
  <table>
    <thead><tr><th>Data</th><th>IP</th><th>Repo</th><th>Asset</th><th>User agent</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
};
