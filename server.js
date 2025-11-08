// server.js (production-ready)

const express = require('express');
const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const app = express();

/* --------------------------
   Config
--------------------------- */
const PORT = process.env.PORT || 8080; // Cloud Run defaults to 8080
const STATIC_DIR = path.join(__dirname, 'public');
const BUNDLED_JOKES_PATH = path.join(__dirname, 'jokes.json'); // read-only in Cloud Run image
const RUNTIME_JOKES_PATH = path.join('/tmp', 'jokes.json');     // writable in Cloud Run instance

// CORS allow-list (comma-separated), e.g. "https://<project>.web.app,https://example.com"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/* --------------------------
   Lightweight hardening / headers
--------------------------- */
app.disable('x-powered-by'); // don’t advertise Express

// Simple CORS (preflight included)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Vary', 'Origin'); // proper caching behavior for CORS
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Parse JSON bodies
app.use(express.json({ limit: '200kb' }));

// Serve static files with sensible caching
app.use(
  express.static(STATIC_DIR, {
    index: 'index.html',
    etag: true,
    lastModified: true,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // Cache-bust JS/CSS by filename hashing if you add it later; for now short cache
      if (/\.(html)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

/* --------------------------
   Jokes storage helpers
--------------------------- */
let jokesCache = []; // in-memory for speed

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadInitialJokes() {
  // Prefer runtime file if present (edits from this instance)
  if (await fileExists(RUNTIME_JOKES_PATH)) {
    const raw = await fs.readFile(RUNTIME_JOKES_PATH, 'utf-8');
    jokesCache = JSON.parse(raw);
    return;
  }
  // Fallback to bundled file baked in the image
  const raw = await fs.readFile(BUNDLED_JOKES_PATH, 'utf-8');
  jokesCache = JSON.parse(raw);
}

async function persistJokes() {
  // Write only to /tmp; ignore errors silently (don’t crash prod traffic)
  try {
    await fs.writeFile(RUNTIME_JOKES_PATH, JSON.stringify(jokesCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist jokes to /tmp:', e.message);
  }
}

/* --------------------------
   Health checks
--------------------------- */
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }));

/* --------------------------
   API routes
--------------------------- */

// GET all jokes
app.get('/api/jokes', (_req, res) => {
  res.json(jokesCache);
});

// GET one random joke
app.get('/api/jotd', (_req, res) => {
  if (!Array.isArray(jokesCache) || jokesCache.length === 0) {
    return res.status(404).json({ detail: 'No jokes available.' });
  }
  const idx = Math.floor(Math.random() * jokesCache.length);
  res.json(jokesCache[idx]);
});

// POST create a new joke (required: setup, punchline, category)
app.post('/api/jokes', async (req, res) => {
  const { setup, punchline, category } = req.body || {};
  if (
    typeof setup !== 'string' || !setup.trim() ||
    typeof punchline !== 'string' || !punchline.trim() ||
    typeof category !== 'string' || !category.trim()
  ) {
    return res.status(400).json({ detail: 'setup, punchline, and category are all required.' });
  }

  const newJoke = {
    setup: setup.trim(),
    punchline: punchline.trim(),
    category: category.trim(),
  };

  jokesCache.push(newJoke);
  await persistJokes();

  res.status(201).json({ ok: true, joke: newJoke, count: jokesCache.length });
});

/* --------------------------
   Fallbacks & errors
--------------------------- */

// Serve index on root (useful if static middleware didn’t catch it)
app.get('/', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// 404 for unknown API paths (after known routes)
app.use('/api', (_req, res) => res.status(404).json({ detail: 'Not found' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ detail: 'Internal Server Error' });
});

/* --------------------------
   Boot & graceful shutdown
--------------------------- */
async function start() {
  try {
    await loadInitialJokes();
  } catch (e) {
    console.error('Failed to load jokes.json:', e);
    jokesCache = [];
  }

  app.listen(PORT, () => {
    console.log(`✅ Service listening on port ${PORT}`);
  });
}

start();

// Graceful shutdown for Cloud Run (optional)
function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down…`);
  // If you had DB connections, close here, then:
  process.exit(0);
}
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => shutdown(sig)));
