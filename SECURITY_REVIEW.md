# Security Review

## Overview

This document captures the security analysis of the random-calvin-and-hobbes application,
including vulnerabilities identified, mitigations applied, and remaining recommendations.

## Vulnerabilities Identified & Mitigated

### 1. Missing Security Headers (Severity: Medium)

**Risk:** Without proper HTTP headers, the application is vulnerable to clickjacking,
MIME-type sniffing, and cross-site scripting attacks.

**Mitigation applied:** Added `securityHeaders` middleware in `src/middleware/security.js`
that sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (restrictive default-src 'self')
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 2. Server Technology Disclosure (Severity: Low)

**Risk:** Express sends `X-Powered-By: Express` by default, revealing the server
framework to attackers for targeted exploits.

**Mitigation applied:** Disabled via `app.disable('x-powered-by')` and
`res.removeHeader('X-Powered-By')`.

### 3. No Rate Limiting (Severity: Medium)

**Risk:** Without rate limiting, the API is vulnerable to brute-force attacks,
denial-of-service, and resource exhaustion.

**Mitigation applied:** Added in-memory sliding-window rate limiter in
`src/middleware/security.js` (100 requests/minute per IP).

### 4. Missing Input Validation (Severity: High)

**Risk:** Unvalidated user inputs can lead to injection attacks, application crashes,
or unexpected behavior.

**Mitigation applied:**
- Query parameter `character` is validated against an allowlist
- Query parameter `limit` is validated as an integer within bounds (1-100)
- Route parameter `id` is validated as a positive integer
- Query string length is capped at 1024 characters
- Object-type query parameters are coerced to strings to prevent NoSQL injection

### 5. Unbounded Request Body Size (Severity: Medium)

**Risk:** Large payloads can exhaust server memory and cause denial-of-service.

**Mitigation applied:** Express JSON and URL-encoded body parsers limited to 10kb.

### 6. Error Information Leakage (Severity: Medium)

**Risk:** Unhandled errors may expose stack traces, file paths, or internal details.

**Mitigation applied:** Global error handler in `src/middleware/errorHandler.js` returns
generic messages for 500 errors and logs details server-side only.

### 7. Directory Traversal via Static Files (Severity: Low)

**Risk:** Dotfile access in static file serving could expose hidden configuration files.

**Mitigation applied:** Static file serving configured with `{ dotfiles: 'deny' }`.

### 8. Open Proxy Trust (Severity: Low)

**Risk:** Trusting all proxies by default can allow IP spoofing via `X-Forwarded-For`.

**Mitigation applied:** `trust proxy` is only enabled when explicitly set via the
`TRUST_PROXY` environment variable.

## Remaining Recommendations

### Short-term

1. **Add CORS configuration** - Currently no CORS policy is set. If the API will be
   consumed by other origins, configure `Access-Control-Allow-Origin` explicitly
   rather than using `*`.

2. **Use HTTPS in production** - The app listens on plain HTTP. In production, terminate
   TLS via a reverse proxy (nginx, Cloudflare) or use Node's `https` module.

3. **Add Strict-Transport-Security header** - Once HTTPS is configured, add HSTS to
   prevent protocol downgrade attacks.

4. **Environment-based configuration** - Sensitive settings (port, rate limits) should
   come from environment variables, not hardcoded values. Consider a `.env` file
   with `dotenv` (already in `.gitignore`).

### Medium-term

5. **Persistent rate limiting** - The in-memory rate limiter resets on server restart.
   For production, use Redis-backed rate limiting.

6. **Request logging** - Add structured logging (e.g., `pino` or `winston`) with
   request IDs for audit trails and incident response.

7. **Dependency auditing** - Run `npm audit` regularly and pin dependency versions
   to prevent supply chain attacks.

8. **Content Security Policy reporting** - Add `report-uri` or `report-to` directive
   to CSP to collect violation reports.

### Long-term

9. **API authentication** - If the API is extended with write operations (user-submitted
   quotes), add authentication (JWT, API keys) and authorization.

10. **Automated security scanning** - Add SAST/DAST tools to the CI pipeline
    (e.g., `npm audit`, Snyk, or CodeQL).
