/**
 * Global error handling middleware.
 * Prevents leaking stack traces or internal details to clients.
 */
function errorHandler(err, req, res, _next) {
  // Log the full error internally
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  // Never expose internal error details to the client
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500
      ? 'An internal server error occurred.'
      : err.message || 'An error occurred.';

  res.status(statusCode).json({ error: message });
}

/**
 * Handles 404 for unmatched routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Resource not found.' });
}

module.exports = { errorHandler, notFoundHandler };
