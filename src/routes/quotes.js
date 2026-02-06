const express = require('express');
const crypto = require('crypto');
const quotes = require('../data/quotes.json');

const router = express.Router();

// In-memory store for user-submitted quotes (pending moderation)
const pendingQuotes = [];
let nextPendingId = quotes.length + 1;

// Collect all valid tags from the dataset
const validTags = [...new Set(quotes.flatMap((q) => q.tags || []))];

/**
 * Format a quote based on the requested format.
 */
function formatQuote(quote, format) {
  switch (format) {
    case 'text':
      return `"${quote.quote}" — ${quote.character}`;
    case 'markdown':
      return `> ${quote.quote}\n>\n> — **${quote.character}**`;
    default:
      return null; // JSON (handled by caller)
  }
}

/**
 * Send a quote in the requested format.
 */
function sendFormatted(res, data, format) {
  const isSingle = !Array.isArray(data);
  const items = isSingle ? [data] : data;

  if (format === 'text') {
    res.type('text/plain').send(items.map((q) => formatQuote(q, 'text')).join('\n\n'));
  } else if (format === 'markdown') {
    res.type('text/markdown').send(items.map((q) => formatQuote(q, 'markdown')).join('\n\n---\n\n'));
  } else {
    res.json(isSingle ? data : { count: items.length, quotes: items });
  }
}

/**
 * Validate the format query parameter.
 * Returns the format string or null if invalid.
 */
function validateFormat(format) {
  if (!format) return 'json';
  const allowed = ['json', 'text', 'markdown'];
  const normalized = String(format).toLowerCase().trim();
  return allowed.includes(normalized) ? normalized : null;
}

/**
 * GET /api/quotes/random
 * Returns a random Calvin and Hobbes quote.
 * Query params:
 *   - format: json | text | markdown (default: json)
 */
router.get('/random', (req, res) => {
  const format = validateFormat(req.query.format);
  if (!format) {
    return res.status(400).json({ error: 'Invalid format. Allowed: json, text, markdown.' });
  }

  const index = crypto.randomInt(0, quotes.length);
  sendFormatted(res, quotes[index], format);
});

/**
 * GET /api/quotes/daily
 * Returns a deterministic "quote of the day" based on the current date.
 * Query params:
 *   - format: json | text | markdown (default: json)
 */
router.get('/daily', (req, res) => {
  const format = validateFormat(req.query.format);
  if (!format) {
    return res.status(400).json({ error: 'Invalid format. Allowed: json, text, markdown.' });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const hash = crypto.createHash('sha256').update(today).digest();
  const index = hash.readUInt32BE(0) % quotes.length;
  sendFormatted(res, quotes[index], format);
});

/**
 * GET /api/quotes/search
 * Full-text search across quote text.
 * Query params:
 *   - q: search term (required, 1-200 chars)
 *   - format: json | text | markdown (default: json)
 */
router.get('/search', (req, res) => {
  const format = validateFormat(req.query.format);
  if (!format) {
    return res.status(400).json({ error: 'Invalid format. Allowed: json, text, markdown.' });
  }

  const q = req.query.q;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  const trimmed = q.trim();
  if (trimmed.length < 1 || trimmed.length > 200) {
    return res.status(400).json({ error: 'Search query must be between 1 and 200 characters.' });
  }

  const lower = trimmed.toLowerCase();
  const results = quotes.filter(
    (quote) =>
      quote.quote.toLowerCase().includes(lower) ||
      quote.character.toLowerCase().includes(lower)
  );

  sendFormatted(res, results, format);
});

/**
 * GET /api/quotes/tags
 * Returns all available tags.
 */
router.get('/tags', (req, res) => {
  res.json({ tags: validTags });
});

/**
 * GET /api/quotes/pending
 * Returns all pending (unmoderated) quote submissions.
 */
router.get('/pending', (req, res) => {
  res.json({ count: pendingQuotes.length, quotes: pendingQuotes });
});

/**
 * GET /api/quotes
 * Returns quotes with optional filtering and cursor pagination.
 * Query params:
 *   - character: filter by character name (Calvin or Hobbes)
 *   - tag: filter by tag
 *   - cursor: ID to start after (for pagination)
 *   - limit: max number of quotes to return (1-100, default: 20)
 *   - format: json | text | markdown (default: json)
 */
router.get('/', (req, res) => {
  const format = validateFormat(req.query.format);
  if (!format) {
    return res.status(400).json({ error: 'Invalid format. Allowed: json, text, markdown.' });
  }

  let result = [...quotes];
  const { character, tag, cursor, limit } = req.query;

  // Filter by character
  if (character) {
    const allowed = ['calvin', 'hobbes'];
    const normalized = String(character).toLowerCase().trim();
    if (!allowed.includes(normalized)) {
      return res.status(400).json({
        error: 'Invalid character. Allowed values: Calvin, Hobbes.',
      });
    }
    result = result.filter((q) => q.character.toLowerCase() === normalized);
  }

  // Filter by tag
  if (tag) {
    const normalized = String(tag).toLowerCase().trim();
    if (!validTags.includes(normalized)) {
      return res.status(400).json({
        error: `Invalid tag. Allowed values: ${validTags.join(', ')}.`,
      });
    }
    result = result.filter((q) => (q.tags || []).includes(normalized));
  }

  // Cursor pagination: start after the given ID
  if (cursor !== undefined) {
    const cursorId = parseInt(cursor, 10);
    if (isNaN(cursorId) || cursorId < 0) {
      return res.status(400).json({ error: 'Cursor must be a non-negative integer.' });
    }
    const cursorIndex = result.findIndex((q) => q.id === cursorId);
    if (cursorIndex === -1) {
      result = result.filter((q) => q.id > cursorId);
    } else {
      result = result.slice(cursorIndex + 1);
    }
  }

  // Apply limit (default 20)
  const parsedLimit = limit !== undefined ? parseInt(limit, 10) : 20;
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({
      error: 'Limit must be a number between 1 and 100.',
    });
  }
  const paged = result.slice(0, parsedLimit);
  const nextCursor = paged.length === parsedLimit && result.length > parsedLimit
    ? paged[paged.length - 1].id
    : null;

  if (format !== 'json') {
    return sendFormatted(res, paged, format);
  }

  res.json({
    count: paged.length,
    next_cursor: nextCursor,
    quotes: paged,
  });
});

/**
 * POST /api/quotes
 * Submit a new quote for moderation.
 * Body: { quote, character, source }
 */
router.post('/', (req, res) => {
  const { quote, character, source } = req.body || {};

  if (!quote || typeof quote !== 'string' || quote.trim().length < 5 || quote.trim().length > 500) {
    return res.status(400).json({ error: 'Quote is required and must be between 5 and 500 characters.' });
  }

  if (!character || typeof character !== 'string') {
    return res.status(400).json({ error: 'Character is required.' });
  }

  const allowedCharacters = ['calvin', 'hobbes', 'susie', 'mom', 'dad', 'miss wormwood', 'rosalyn', 'moe'];
  const normalizedChar = character.trim().toLowerCase();
  if (!allowedCharacters.includes(normalizedChar)) {
    return res.status(400).json({
      error: `Invalid character. Allowed: ${allowedCharacters.join(', ')}.`,
    });
  }

  const submission = {
    id: nextPendingId++,
    quote: quote.trim(),
    character: character.trim(),
    source: source && typeof source === 'string' ? source.trim().slice(0, 200) : 'Unknown',
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };

  pendingQuotes.push(submission);

  res.status(201).json({
    message: 'Quote submitted for moderation.',
    submission,
  });
});

/**
 * GET /api/quotes/:id
 * Returns a specific quote by ID.
 * Query params:
 *   - format: json | text | markdown (default: json)
 */
router.get('/:id', (req, res) => {
  const format = validateFormat(req.query.format);
  if (!format) {
    return res.status(400).json({ error: 'Invalid format. Allowed: json, text, markdown.' });
  }

  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid quote ID.' });
  }

  const quote = quotes.find((q) => q.id === id);

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found.' });
  }

  sendFormatted(res, quote, format);
});

module.exports = router;
