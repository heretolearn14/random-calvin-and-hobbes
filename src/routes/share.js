const express = require('express');
const quotes = require('../data/quotes.json');

const router = express.Router();

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /quote/:id
 * Serves an HTML page for a specific quote with Open Graph and Twitter Card meta tags
 * for rich social media previews when shared.
 */
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).send('Invalid quote ID.');
  }

  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return res.status(404).send('Quote not found.');
  }

  const safeQuote = escapeHtml(quote.quote);
  const safeCharacter = escapeHtml(quote.character);
  const description = `"${safeQuote}" — ${safeCharacter}`;

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeCharacter}: Calvin &amp; Hobbes Quote</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="Calvin &amp; Hobbes Quote">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Calvin &amp; Hobbes Quote">
  <meta name="twitter:description" content="${description}">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Calvin &amp; Hobbes</h1>
    <div class="quote-card">
      <blockquote>${safeQuote}</blockquote>
      <p class="character">&mdash; ${safeCharacter}</p>
    </div>
    <div class="share-actions">
      <a href="/" class="btn">Get Another Quote</a>
      <button type="button" class="btn btn-secondary" onclick="navigator.clipboard.writeText(window.location.href).then(function(){this.textContent='Copied!'}.bind(this))">Copy Link</button>
    </div>
  </div>
</body>
</html>`);
});

module.exports = router;
