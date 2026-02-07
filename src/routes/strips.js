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

async function fetchStripImage(date) {
  const datePath = formatDatePath(date);

  if (cache.has(datePath)) {
    return cache.get(datePath);
  }

  const url = `https://www.gocomics.com/calvinandhobbes/${datePath}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CalvinHobbesQuoteApp/1.0)',
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  // Extract comic image from og:image meta tag
  const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogMatch) {
    const imageUrl = ogMatch[1];
    if (cache.size >= MAX_CACHE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(datePath, imageUrl);
    return imageUrl;
  }

  // Fallback: look for item-comic-image img src
  const imgMatch = html.match(/<img[^>]+class="[^"]*item-comic-image[^"]*"[^>]+src="([^"]+)"/);
  if (imgMatch) {
    const imageUrl = imgMatch[1];
    cache.set(datePath, imageUrl);
    return imageUrl;
  }

  return null;
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
