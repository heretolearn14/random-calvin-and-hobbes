const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data),
        });
      });
    }).on('error', reject);
  });
}

describe('GET /api/quotes/random', () => {
  it('should return a random quote', async () => {
    const res = await get('/api/quotes/random');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id);
    assert.ok(res.body.quote);
    assert.ok(res.body.character);
  });
});

describe('GET /api/quotes', () => {
  it('should return all quotes', async () => {
    const res = await get('/api/quotes');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count > 0);
    assert.ok(Array.isArray(res.body.quotes));
  });

  it('should filter by character', async () => {
    const res = await get('/api/quotes?character=Hobbes');
    assert.strictEqual(res.status, 200);
    res.body.quotes.forEach((q) => {
      assert.strictEqual(q.character.toLowerCase(), 'hobbes');
    });
  });

  it('should reject invalid character', async () => {
    const res = await get('/api/quotes?character=Spaceman');
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('should apply limit', async () => {
    const res = await get('/api/quotes?limit=3');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.quotes.length, 3);
  });

  it('should reject invalid limit', async () => {
    const res = await get('/api/quotes?limit=999');
    assert.strictEqual(res.status, 400);
  });
});

describe('GET /api/quotes/:id', () => {
  it('should return quote by id', async () => {
    const res = await get('/api/quotes/1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 1);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await get('/api/quotes/9999');
    assert.strictEqual(res.status, 404);
  });

  it('should return 400 for invalid id', async () => {
    const res = await get('/api/quotes/abc');
    assert.strictEqual(res.status, 400);
  });
});

describe('Security headers', () => {
  it('should include security headers', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.ok(res.headers['content-security-policy']);
    assert.ok(!res.headers['x-powered-by']);
  });
});

describe('GET /api/health', () => {
  it('should return ok', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, { status: 'ok' });
  });
});

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await get('/api/nonexistent');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});
