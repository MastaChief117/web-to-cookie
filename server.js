// CookieHost V1 — static-only server.
// Serves the app itself. Never stores uploaded sites. No DB, no auth, no uploads.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid PORT');
const PUBLIC = path.join(__dirname, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function safeJoin(base, reqPath) {
  let decoded;
  try { decoded = decodeURIComponent(reqPath.split('?')[0]); }
  catch { return null; }
  const normalized = path.posix.normalize(decoded);
  const rel = normalized.replace(/^\/+/, '');
  const full = path.resolve(base, rel);
  const relative = path.relative(path.resolve(base), full);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  return full;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }
  const urlPath = req.url.split('?')[0];

  // Routes: / and /builder -> builder app, /loadsite -> loader app
  let filePath;
  if (urlPath === '/' || urlPath === '/builder' || urlPath === '/builder/') {
    filePath = path.join(PUBLIC, 'index.html');
  } else if (urlPath === '/loadsite' || urlPath === '/loadsite/') {
    filePath = path.join(PUBLIC, 'loadsite', 'index.html');
  } else {
    filePath = safeJoin(PUBLIC, urlPath);
    if (!filePath) return send(res, 403, 'Forbidden');
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const idx = path.join(filePath, 'index.html');
        if (fs.existsSync(idx)) filePath = idx;
        else return send(res, 404, 'Not found');
      }
    } catch {
      return send(res, 404, 'Not found — try /builder or /loadsite');
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🍪 CookieHost V1 on http://localhost:${PORT}`);
  console.log(`   builder  -> /builder`);
  console.log(`   loader   -> /loadsite`);
});