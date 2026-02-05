# Feature Recommendations

## Current Features

- Random quote endpoint (`GET /api/quotes/random`)
- List all quotes with character filtering and pagination (`GET /api/quotes`)
- Get quote by ID (`GET /api/quotes/:id`)
- Static frontend with one-click random quote display
- Health check endpoint

## Proposed New Features

### 1. Quote of the Day

**Description:** Return a deterministic "quote of the day" that stays the same for all
users throughout a calendar day, based on a hash of the date.

**Endpoint:** `GET /api/quotes/daily`

**Value:** Provides a shared social experience and is useful for embedding on external sites.

### 2. Search Quotes

**Description:** Full-text search across quote text.

**Endpoint:** `GET /api/quotes/search?q=<term>`

**Value:** Lets users find half-remembered quotes quickly.

### 3. Favorites / Bookmarking (Client-side)

**Description:** Allow users to "favorite" quotes. Store favorites in `localStorage`
on the client side (no auth required).

**Value:** Personalization without requiring user accounts or a database.

### 4. Share Quote

**Description:** Generate a shareable link for a specific quote, and add
Open Graph / Twitter Card meta tags for rich social media previews.

**Endpoint:** `GET /quote/:id` (HTML page with OG tags)

**Value:** Viral distribution through social media sharing.

### 5. Quote Categories / Tags

**Description:** Add tags to quotes (e.g., "philosophy", "school", "imagination",
"Spaceman Spiff") and allow filtering by tag.

**Endpoint:** `GET /api/quotes?tag=philosophy`

**Value:** Richer browsing experience and content discovery.

### 6. Random Quote Widget / Embed

**Description:** Provide an embeddable `<iframe>` or `<script>` snippet that other
sites can use to display a random quote.

**Endpoint:** `GET /api/widget` (returns styled HTML fragment)

**Value:** Increases reach and usage beyond direct visitors.

### 7. Multiple Response Formats

**Description:** Support returning quotes as plain text, Markdown, or JSON
via the `Accept` header or a `format` query parameter.

**Endpoints:**
- `GET /api/quotes/random?format=text`
- `GET /api/quotes/random?format=markdown`

**Value:** Makes the API useful for CLI tools, README generators, and Slack bots.

### 8. Quote Submission (with Moderation)

**Description:** Allow users to submit new quotes via a `POST` endpoint.
Submissions go into a pending queue and require admin approval.

**Endpoint:** `POST /api/quotes` (body: `{ quote, character, source }`)

**Value:** Community-driven content growth.

**Security note:** This feature requires authentication, input sanitization,
and spam prevention (CAPTCHA or rate limiting).

### 9. Pagination with Cursor

**Description:** Replace simple `limit` with cursor-based pagination for
efficient traversal of large quote collections.

**Endpoint:** `GET /api/quotes?cursor=<id>&limit=10`

**Value:** Scales well as the quote database grows.

### 10. Dark Mode Toggle

**Description:** Add a dark/light theme toggle to the frontend, stored in
`localStorage` and respecting `prefers-color-scheme`.

**Value:** Improved accessibility and user preference support.

### 11. Keyboard Shortcuts

**Description:** Add keyboard shortcut (e.g., Space or Enter) to fetch a
new random quote without clicking the button.

**Value:** Better UX for power users.

### 12. API Documentation (OpenAPI/Swagger)

**Description:** Add an OpenAPI 3.0 spec and serve interactive docs at `/api/docs`.

**Value:** Makes the API self-documenting and easier for developers to integrate.
