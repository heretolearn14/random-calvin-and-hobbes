# Features

All 12 proposed features have been implemented.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/quotes/random` | GET | Random quote (supports `?format=json\|text\|markdown`) |
| `/api/quotes/daily` | GET | Deterministic quote of the day |
| `/api/quotes/search?q=<term>` | GET | Full-text search across quotes |
| `/api/quotes/tags` | GET | List all available tags |
| `/api/quotes/pending` | GET | List pending user submissions |
| `/api/quotes` | GET | List quotes with filtering and cursor pagination |
| `/api/quotes` | POST | Submit a new quote for moderation |
| `/api/quotes/:id` | GET | Get a specific quote by ID |
| `/api/widget` | GET | Embeddable HTML widget with random quote |
| `/api/health` | GET | Health check |
| `/api/docs` | GET | Redirect to interactive API documentation |
| `/quote/:id` | GET | Share page with Open Graph meta tags |

## Query Parameters (GET /api/quotes)

| Parameter | Description |
|---|---|
| `character` | Filter by character (Calvin, Hobbes) |
| `tag` | Filter by tag (philosophy, humor, friendship, etc.) |
| `cursor` | Quote ID to start after (cursor pagination) |
| `limit` | Results per page, 1-100 (default: 20) |
| `format` | Response format: json, text, markdown |

## Frontend Features

1. **Dark Mode** - Toggle with button or `D` key. Respects `prefers-color-scheme` and persists in `localStorage`.
2. **Favorites** - Click heart or press `F` to favorite quotes. Stored in `localStorage`. View/manage favorites list.
3. **Keyboard Shortcuts** - `Space` random quote, `F` favorite, `S` share, `D` dark mode, `/` focus search, `Esc` blur input.
4. **Search** - Real-time search bar with results that can be clicked to display.
5. **Share** - Uses Web Share API on supported devices, falls back to clipboard copy. Share pages at `/quote/:id` include OG meta tags.
6. **Quote of the Day** - Button fetches a deterministic daily quote.
7. **Tags** - Displayed as colored pills on each quote card.
8. **Embed Widget** - `<iframe src="/api/widget" width="500" height="200"></iframe>`

## Implemented Feature Details

### 1. Quote of the Day
Deterministic daily quote using SHA-256 hash of the date string (YYYY-MM-DD). Same quote for all users within a calendar day.

### 2. Search Quotes
Case-insensitive search across quote text and character names. Query must be 1-200 characters.

### 3. Favorites / Bookmarking
Client-side `localStorage` persistence. Toggle with heart button or `F` key. Favorites section shows/hides with count.

### 4. Share Quote
Server-rendered HTML page at `/quote/:id` with `og:title`, `og:description`, `twitter:card` meta tags. Frontend uses Web Share API with clipboard fallback.

### 5. Quote Categories / Tags
9 tags across 20 quotes: adventure, friendship, imagination, philosophy, humor, leisure, growing-up, school, wisdom, rebellion. Filter via `?tag=` query parameter.

### 6. Random Quote Widget
Self-contained HTML page at `/api/widget` with inline CSS. Embeddable via iframe.

### 7. Multiple Response Formats
All quote endpoints support `?format=json|text|markdown`. Text returns `"quote" — Character`, Markdown returns blockquote format.

### 8. Quote Submission
`POST /api/quotes` accepts `{ quote, character, source }`. Validates quote length (5-500 chars) and character against allowlist. Submissions stored in memory as pending.

### 9. Cursor Pagination
`GET /api/quotes` returns `next_cursor` when more results are available. Pass `?cursor=<id>&limit=N` to paginate.

### 10. Dark Mode
CSS custom properties with `[data-theme="dark"]` selector. Respects `prefers-color-scheme` media query. Persisted in `localStorage`.

### 11. Keyboard Shortcuts
Global keydown listener with input-focus awareness. Shortcuts displayed in footer.

### 12. API Documentation
OpenAPI 3.0 spec at `/openapi.json`. Interactive Swagger UI at `/docs.html` (also accessible via `/api/docs` redirect).
