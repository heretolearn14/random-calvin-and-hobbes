const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Calvin and Hobbes ran from Nov 18, 1985 to Dec 31, 1995
const START = new Date('1985-11-18T00:00:00Z');
const END = new Date('1995-12-31T00:00:00Z');
const TOTAL_DAYS = Math.floor((END - START) / 86400000) + 1;

// Simple in-memory cache: dateString -> imageUrl
const cache = new Map();
const MAX_CACHE = 500;

function randomDate() {
  const dayOffset = crypto.randomInt(0, TOTAL_DAYS);
  const date = new Date(START.getTime() + dayOffset * 86400000);
  return date;
}

function dailyDate() {
  const today = new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha256').update(today).digest();
  const dayOffset = hash.readUInt32BE(0) % TOTAL_DAYS;
  return new Date(START.getTime() + dayOffset * 86400000);
}

function formatDatePath(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function formatDateDisplay(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function cacheImage(datePath, imageUrl) {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(datePath, imageUrl);
}

function extractImageUrl(html) {
  // Try og:image (both attribute orders)
  const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  if (ogMatch) return ogMatch[1];

  // Try twitter:image
  const twitterMatch = html.match(/<meta\s+(?:name|property)="twitter:image"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+(?:name|property)="twitter:image"/i);
  if (twitterMatch) return twitterMatch[1];

  // Try item-comic-image class
  const imgMatch = html.match(/<img[^>]+class="[^"]*item-comic-image[^"]*"[^>]+src="([^"]+)"/i);
  if (imgMatch) return imgMatch[1];

  // Try comic__image class
  const comicMatch = html.match(/<img[^>]+class="[^"]*comic__image[^"]*"[^>]+src="([^"]+)"/i);
  if (comicMatch) return comicMatch[1];

  // Try any amuniversal.com image URL in the page
  const amuMatch = html.match(/https:\/\/assets\.amuniversal\.com\/[a-f0-9]+/i);
  if (amuMatch) return amuMatch[0];

  return null;
}

async function fetchStripImage(date) {
  const datePath = formatDatePath(date);

  if (cache.has(datePath)) {
    return cache.get(datePath);
  }

  const url = `https://www.gocomics.com/calvinandhobbes/${datePath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const imageUrl = extractImageUrl(html);

  if (imageUrl) {
    cacheImage(datePath, imageUrl);
  }

  return imageUrl;
}

/**
 * GET /api/strips/random
 * Returns a random Calvin and Hobbes comic strip.
 */
router.get('/random', async (req, res, next) => {
  try {
    const date = randomDate();
    const imageUrl = await fetchStripImage(date);

    if (!imageUrl) {
      return res.status(502).json({ error: 'Could not fetch comic strip. Try again.' });
    }

    res.json({
      date: formatDatePath(date),
      dateDisplay: formatDateDisplay(date),
      imageUrl,
      goComicsUrl: `https://www.gocomics.com/calvinandhobbes/${formatDatePath(date)}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/strips/daily
 * Returns the comic strip of the day (deterministic per calendar day).
 */
router.get('/daily', async (req, res, next) => {
  try {
    const date = dailyDate();
    const imageUrl = await fetchStripImage(date);

    if (!imageUrl) {
      return res.status(502).json({ error: 'Could not fetch comic strip. Try again.' });
    }

    res.json({
      date: formatDatePath(date),
      dateDisplay: formatDateDisplay(date),
      imageUrl,
      goComicsUrl: `https://www.gocomics.com/calvinandhobbes/${formatDatePath(date)}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/strips/debug
 * Debug endpoint to check GoComics connectivity.
 */
router.get('/debug', async (req, res) => {
  const date = new Date('1990-01-15T00:00:00Z');
  const datePath = formatDatePath(date);
  const url = `https://www.gocomics.com/calvinandhobbes/${datePath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const imageUrl = extractImageUrl(html);

    res.json({
      gocomicsStatus: response.status,
      htmlLength: html.length,
      imageFound: !!imageUrl,
      imageUrl: imageUrl || 'NOT FOUND',
      htmlSnippet: html.substring(0, 500),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    res.json({
      error: err.message,
      type: err.name,
    });
  }
});

/**
 * GET /api/strips/:year/:month/:day
 * Returns a specific comic strip by date.
 */
router.get('/:year/:month/:day', async (req, res, next) => {
  try {
    const { year, month, day } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);

    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1985 || y > 1995 || m < 1 || m > 12 || d < 1 || d > 31) {
      return res.status(400).json({ error: 'Invalid date. Must be between 1985-11-18 and 1995-12-31.' });
    }

    const date = new Date(Date.UTC(y, m - 1, d));
    if (date < START || date > END) {
      return res.status(400).json({ error: 'Date out of range. Calvin and Hobbes ran from 1985-11-18 to 1995-12-31.' });
    }

    const imageUrl = await fetchStripImage(date);

    if (!imageUrl) {
      return res.status(502).json({ error: 'Could not fetch comic strip for this date.' });
    }

    res.json({
      date: formatDatePath(date),
      dateDisplay: formatDateDisplay(date),
      imageUrl,
      goComicsUrl: `https://www.gocomics.com/calvinandhobbes/${formatDatePath(date)}`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
