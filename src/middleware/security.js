/**
 * Security middleware for the application.
 */

/**
 * Sets security-related HTTP headers.
 */
function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
  );

  // Prevent browsers from caching sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // Remove X-Powered-By header to avoid exposing server technology
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Rate limiter using a sliding window approach.
 * Limits requests per IP address.
 */
function createRateLimiter({ windowMs = 60000, maxRequests = 100 } = {}) {
  const requests = new Map();

  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requests.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, valid);
      }
    }
  }, windowMs);

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = (requests.get(ip) || []).filter((t) => t > windowStart);
    timestamps.push(now);
    requests.set(ip, timestamps);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - timestamps.length)));

    if (timestamps.length > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    next();
  };
}

/**
 * Validates that request parameters are safe.
 * Prevents NoSQL injection and other parameter pollution attacks.
 */
function inputSanitizer(req, res, next) {
  // Limit query string size to prevent ReDoS and large payload attacks
  const queryString = req.originalUrl.split('?')[1] || '';
  if (queryString.length > 1024) {
    return res.status(400).json({ error: 'Query string too long.' });
  }

  // Limit request body size (handled by express.json limit option)
  // Sanitize query parameters - only allow expected types
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'object' && value !== null) {
      // Prevent parameter pollution / NoSQL injection via object params
      req.query[key] = String(value);
    }
  }

  next();
}

module.exports = { securityHeaders, createRateLimiter, inputSanitizer };
