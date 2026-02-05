const express = require('express');
const path = require('path');
const { securityHeaders, createRateLimiter, inputSanitizer } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const quotesRouter = require('./routes/quotes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy only if explicitly configured
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

// Disable x-powered-by header
app.disable('x-powered-by');

// Security middleware
app.use(securityHeaders);
app.use(createRateLimiter({ windowMs: 60000, maxRequests: 100 }));
app.use(inputSanitizer);

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny' }));

// API routes
app.use('/api/quotes', quotesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all: 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Only start listening if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
