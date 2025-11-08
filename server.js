const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve static files (index.html, app.js, style.css, add.html, add.js)
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies for POST requests
app.use(express.json({ limit: '200kb' }));

// Jokes data file
const JOKES_PATH = path.join(__dirname, 'jokes.json');

function loadJokes() {
  return JSON.parse(fs.readFileSync(JOKES_PATH, 'utf-8'));
}

function saveJokes(jokes) {
  fs.writeFileSync(JOKES_PATH, JSON.stringify(jokes, null, 2), 'utf-8');
}

// REST: Return all jokes
app.get('/api/jokes', (req, res) => {
  res.json(loadJokes());
});

// REST: Return a random joke
app.get('/api/jotd', (req, res) => {
  const jokes = loadJokes();
  if (!Array.isArray(jokes) || jokes.length === 0) {
    return res.status(404).json({ detail: 'No jokes available.' });
  }
  const idx = Math.floor(Math.random() * jokes.length);
  res.json(jokes[idx]);
});

// REST: Create a new joke (setup, punchline, category) — all required
app.post('/api/jokes', (req, res) => {
  const { setup, punchline, category } = req.body || {};
  if (
    typeof setup !== 'string' || !setup.trim() ||
    typeof punchline !== 'string' || !punchline.trim() ||
    typeof category !== 'string' || !category.trim()
  ) {
    return res.status(400).json({ detail: 'setup, punchline, and category are all required.' });
  }

  // Normalize minimal
  const newJoke = {
    setup: setup.trim(),
    punchline: punchline.trim(),
    category: category.trim()
  };

  // Simple append (single-process). For multi-instance, use a DB.
  const jokes = loadJokes();
  jokes.push(newJoke);
  saveJokes(jokes);

  res.status(201).json({ ok: true, joke: newJoke, count: jokes.length });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
