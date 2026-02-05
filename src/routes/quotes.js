const express = require('express');
const crypto = require('crypto');
const quotes = require('../data/quotes.json');

const router = express.Router();

/**
 * GET /api/quotes/random
 * Returns a random Calvin and Hobbes quote.
 */
router.get('/random', (req, res) => {
  const index = crypto.randomInt(0, quotes.length);
  res.json(quotes[index]);
});

/**
 * GET /api/quotes
 * Returns all quotes, with optional filtering by character.
 * Query params:
 *   - character: filter by character name (Calvin or Hobbes)
 *   - limit: max number of quotes to return (1-100, default: all)
 */
router.get('/', (req, res) => {
  let result = [...quotes];

  // Filter by character
  const { character, limit } = req.query;

  if (character) {
    const allowed = ['calvin', 'hobbes'];
    const normalized = String(character).toLowerCase().trim();
    if (!allowed.includes(normalized)) {
      return res.status(400).json({
        error: 'Invalid character. Allowed values: Calvin, Hobbes.',
      });
    }
    result = result.filter(
      (q) => q.character.toLowerCase() === normalized
    );
  }

  // Apply limit
  if (limit !== undefined) {
    const parsed = parseInt(limit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      return res.status(400).json({
        error: 'Limit must be a number between 1 and 100.',
      });
    }
    result = result.slice(0, parsed);
  }

  res.json({ count: result.length, quotes: result });
});

/**
 * GET /api/quotes/:id
 * Returns a specific quote by ID.
 */
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid quote ID.' });
  }

  const quote = quotes.find((q) => q.id === id);

  if (!quote) {
    return res.status(404).json({ error: 'Quote not found.' });
  }

  res.json(quote);
});

module.exports = router;
