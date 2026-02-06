const serverless = require('serverless-http');
const app = require('../../src/server');

// Netlify passes the original request path to functions (e.g. /api/quotes/random),
// so we reuse the main Express app which already mounts routes at /api/*.
module.exports.handler = serverless(app);
