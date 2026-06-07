'use strict';

// Zero-dependency static + JSON-state server for the Baby-Gear Trade Study.
// Run with: node server.js   (no `npm install` required)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readSeed() {
  return fs.readFileSync(SEED_FILE, 'utf8');
}

// Ensure state.json exists, seeding it from seed.json on first run.
function ensureState() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, readSeed());
    console.log('Seeded data/state.json from data/seed.json');
  }
}

function sendJSON(res, code, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  // Prevent path traversal outside PUBLIC_DIR.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => {
      chunks += c;
      if (chunks.length > 5e6) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(chunks));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];

    if (url === '/api/state' && req.method === 'GET') {
      ensureState();
      return sendJSON(res, 200, fs.readFileSync(STATE_FILE, 'utf8'));
    }

    if (url === '/api/state' && (req.method === 'PUT' || req.method === 'POST')) {
      const body = await readBody(req);
      let parsed;
      try { parsed = JSON.parse(body); }
      catch (e) { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
      fs.writeFileSync(STATE_FILE, JSON.stringify(parsed, null, 2));
      return sendJSON(res, 200, { ok: true });
    }

    if (url === '/api/reset' && req.method === 'POST') {
      fs.writeFileSync(STATE_FILE, readSeed());
      return sendJSON(res, 200, fs.readFileSync(STATE_FILE, 'utf8'));
    }

    if (url === '/api/seed' && req.method === 'GET') {
      return sendJSON(res, 200, readSeed());
    }

    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: String(err && err.message || err) });
  }
});

server.listen(PORT, () => {
  ensureState();
  console.log(`Baby-Gear Trade Study running at http://localhost:${PORT}`);
});
