const express = require('express');
const crypto = require('crypto');
const quotes = require('../data/quotes.json');

const router = express.Router();

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /api/widget
 * Returns a self-contained HTML fragment for embedding a random quote.
 * Can be loaded in an iframe on external sites.
 */
router.get('/', (req, res) => {
  const index = crypto.randomInt(0, quotes.length);
  const quote = quotes[index];
  const safeQuote = escapeHtml(quote.quote);
  const safeCharacter = escapeHtml(quote.character);

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fdf6e3;
      color: #333;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .widget {
      background: #fff;
      border-left: 4px solid #b22222;
      border-radius: 4px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 480px;
      width: 100%;
    }
    blockquote {
      font-size: 1.1rem;
      line-height: 1.5;
      font-style: italic;
    }
    .character {
      margin-top: 0.75rem;
      font-weight: bold;
      color: #555;
      font-size: 0.95rem;
    }
    .footer {
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="widget">
    <blockquote>${safeQuote}</blockquote>
    <p class="character">&mdash; ${safeCharacter}</p>
    <p class="footer">Calvin &amp; Hobbes Quotes</p>
  </div>
</body>
</html>`);
});

module.exports = router;
