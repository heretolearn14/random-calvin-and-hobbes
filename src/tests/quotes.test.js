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

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search };
    const headers = {};
    let bodyStr;

    if (body) {
      bodyStr = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    options.headers = headers;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function get(path) { return request('GET', path); }
function post(path, body) { return request('POST', path, body); }

// ============================================================
// Feature: Random quote
// ============================================================
describe('GET /api/quotes/random', () => {
  it('should return a random quote', async () => {
    const res = await get('/api/quotes/random');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id);
    assert.ok(res.body.quote);
    assert.ok(res.body.character);
    assert.ok(Array.isArray(res.body.tags));
  });
});

// ============================================================
// Feature 1: Quote of the Day
// ============================================================
describe('GET /api/quotes/daily', () => {
  it('should return a deterministic daily quote', async () => {
    const res1 = await get('/api/quotes/daily');
    const res2 = await get('/api/quotes/daily');
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.id, res2.body.id);
    assert.ok(res1.body.quote);
  });
});

// ============================================================
// Feature 2: Search
// ============================================================
describe('GET /api/quotes/search', () => {
  it('should return matching quotes', async () => {
    const res = await get('/api/quotes/search?q=magical');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count >= 1);
    assert.ok(res.body.quotes[0].quote.toLowerCase().includes('magical'));
  });

  it('should return empty array for no matches', async () => {
    const res = await get('/api/quotes/search?q=zzzznonexistent');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 0);
  });

  it('should require q parameter', async () => {
    const res = await get('/api/quotes/search');
    assert.strictEqual(res.status, 400);
  });
});

// ============================================================
// Feature 5: Tags
// ============================================================
describe('GET /api/quotes/tags', () => {
  it('should return available tags', async () => {
    const res = await get('/api/quotes/tags');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.tags));
    assert.ok(res.body.tags.length > 0);
    assert.ok(res.body.tags.includes('philosophy'));
  });
});

describe('GET /api/quotes?tag=', () => {
  it('should filter by tag', async () => {
    const res = await get('/api/quotes?tag=philosophy');
    assert.strictEqual(res.status, 200);
    res.body.quotes.forEach((q) => {
      assert.ok(q.tags.includes('philosophy'));
    });
  });

  it('should reject invalid tag', async () => {
    const res = await get('/api/quotes?tag=nonexistent_tag');
    assert.strictEqual(res.status, 400);
  });
});

// ============================================================
// Feature 7: Multiple Response Formats
// ============================================================
describe('Multiple response formats', () => {
  it('should return text format', async () => {
    const res = await get('/api/quotes/random?format=text');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'));
    assert.ok(typeof res.body === 'string');
  });

  it('should return markdown format', async () => {
    const res = await get('/api/quotes/random?format=markdown');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/markdown'));
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.startsWith('>'));
  });

  it('should reject invalid format', async () => {
    const res = await get('/api/quotes/random?format=xml');
    assert.strictEqual(res.status, 400);
  });
});

// ============================================================
// Feature 8: Quote Submission
// ============================================================
describe('POST /api/quotes', () => {
  it('should accept a valid submission', async () => {
    const res = await post('/api/quotes', {
      quote: 'This is a test quote for submission.',
      character: 'Calvin',
      source: 'Test strip',
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.submission.status, 'pending');
    assert.ok(res.body.submission.id);
  });

  it('should reject a submission with short quote', async () => {
    const res = await post('/api/quotes', {
      quote: 'Hi',
      character: 'Calvin',
    });
    assert.strictEqual(res.status, 400);
  });

  it('should reject invalid character', async () => {
    const res = await post('/api/quotes', {
      quote: 'This is a valid length quote.',
      character: 'Batman',
    });
    assert.strictEqual(res.status, 400);
  });
});

describe('GET /api/quotes/pending', () => {
  it('should return pending submissions', async () => {
    const res = await get('/api/quotes/pending');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count >= 0);
    assert.ok(Array.isArray(res.body.quotes));
  });
});

// ============================================================
// Feature 9: Cursor Pagination
// ============================================================
describe('Cursor pagination', () => {
  it('should return paginated results with next_cursor', async () => {
    const res = await get('/api/quotes?limit=5');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.quotes.length, 5);
    assert.ok(res.body.next_cursor !== undefined);
  });

  it('should paginate using cursor', async () => {
    const page1 = await get('/api/quotes?limit=5');
    assert.ok(page1.body.next_cursor);
    const page2 = await get(`/api/quotes?cursor=${page1.body.next_cursor}&limit=5`);
    assert.strictEqual(page2.status, 200);
    // Ensure no overlap between pages
    const page1Ids = page1.body.quotes.map((q) => q.id);
    const page2Ids = page2.body.quotes.map((q) => q.id);
    page2Ids.forEach((id) => {
      assert.ok(!page1Ids.includes(id), `ID ${id} should not appear in both pages`);
    });
  });

  it('should reject invalid cursor', async () => {
    const res = await get('/api/quotes?cursor=-1');
    assert.strictEqual(res.status, 400);
  });
});

// ============================================================
// Original tests (list, get by ID)
// ============================================================
describe('GET /api/quotes', () => {
  it('should return all quotes', async () => {
    const res = await get('/api/quotes?limit=100');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.count > 0);
    assert.ok(Array.isArray(res.body.quotes));
  });

  it('should filter by character', async () => {
    const res = await get('/api/quotes?character=Hobbes&limit=100');
    assert.strictEqual(res.status, 200);
    res.body.quotes.forEach((q) => {
      assert.strictEqual(q.character.toLowerCase(), 'hobbes');
    });
  });

  it('should reject invalid character', async () => {
    const res = await get('/api/quotes?character=Spaceman');
    assert.strictEqual(res.status, 400);
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
    assert.ok(Array.isArray(res.body.tags));
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

// ============================================================
// Feature 4: Share page
// ============================================================
describe('GET /quote/:id (share page)', () => {
  it('should return HTML with OG tags', async () => {
    const res = await get('/quote/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.includes('og:description'));
    assert.ok(res.body.includes('twitter:card'));
  });

  it('should return 404 for non-existent quote', async () => {
    const res = await get('/quote/9999');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// Feature 6: Widget
// ============================================================
describe('GET /api/widget', () => {
  it('should return embeddable HTML', async () => {
    const res = await get('/api/widget');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.includes('class="widget"'));
  });
});

// ============================================================
// Security & system
// ============================================================
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
