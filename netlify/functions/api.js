const serverless = require('serverless-http');
const express = require('express');
const quotesRouter = require('../../src/routes/quotes');
const { securityHeaders, inputSanitizer } = require('../../src/middleware/security');
const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');

const app = express();
app.disable('x-powered-by');

app.use(securityHeaders);
app.use(inputSanitizer);
app.use(express.json({ limit: '10kb' }));

// Routes are mounted without /api prefix because the Netlify redirect
// rewrites /api/* → /.netlify/functions/api/:splat, so the function
// only sees the path after /api/.
app.use('/quotes', quotesRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports.handler = serverless(app);
