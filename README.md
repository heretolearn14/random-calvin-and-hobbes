# Random Calvin & Hobbes

A web app that displays random Calvin and Hobbes comic strips, fetched from GoComics. Features a winter snow theme, dark mode, favorites, and keyboard shortcuts.

**Live:** [calhob.netlify.app](https://calhob.netlify.app)

## Features

- **Random Comic Strips** - Fetches strips from the full 1985-1995 Calvin and Hobbes archive
- **Strip of the Day** - Deterministic daily strip using date-based hashing
- **Favorites** - Save strips to your favorites list (stored in localStorage)
- **Dark Mode** - Toggle between light and dark winter themes
- **Keyboard Shortcuts** - `Space` random, `F` favorite, `S` share, `D` dark mode
- **Snow Theme** - Falling snowflakes with a frosted glass UI
- **Share** - Web Share API with clipboard fallback

## Tech Stack

- **Backend:** Node.js, Express
- **Hosting:** Netlify (serverless functions)
- **Frontend:** Vanilla HTML/CSS/JS
- **Comic Source:** GoComics (server-side scraping with caching)

## Project Structure

```
├── public/              # Static frontend assets
│   ├── index.html       # Main page
│   ├── app.js           # Frontend logic (strips, favorites, snow, theme)
│   └── style.css        # Winter snow theme styles
├── src/
│   ├── server.js        # Express app
│   ├── routes/
│   │   ├── strips.js    # Comic strip endpoints (random, daily, by date)
│   │   ├── quotes.js    # Quotes API (search, tags, pagination)
│   │   ├── share.js     # OG meta tag share pages
│   │   └── widget.js    # Embeddable widget
│   ├── middleware/
│   │   ├── security.js  # CSP, rate limiter, input sanitizer
│   │   └── errorHandler.js
│   ├── data/
│   │   └── quotes.json  # 20 curated quotes with tags
│   └── tests/
│       └── quotes.test.js
├── netlify/
│   └── functions/
│       └── api.js       # Serverless function entry point
└── netlify.toml         # Netlify build & redirect config
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/strips/random` | Random comic strip |
| `GET /api/strips/daily` | Strip of the day |
| `GET /api/strips/:year/:month/:day` | Strip by date (1985-1995) |
| `GET /api/quotes/random` | Random quote (`?format=json\|text\|markdown`) |
| `GET /api/quotes/daily` | Quote of the day |
| `GET /api/quotes` | List quotes (cursor pagination, tag/character filters) |
| `GET /api/quotes/tags` | All available tags |
| `GET /api/quotes/search?q=` | Full-text quote search |
| `POST /api/quotes` | Submit a quote for moderation |
| `GET /api/health` | Health check |

## Getting Started

```bash
# Install dependencies
npm install

# Run locally
npm start

# Run with auto-reload
npm run dev

# Run tests
npm test
```

The server starts on `http://localhost:3000` by default.

## Deployment

The app is configured for Netlify deployment. The `netlify.toml` handles:
- Redirecting `/api/*` requests to the serverless function
- Serving static files from `public/`
- Security headers

## Security

The app includes several security measures:
- Content Security Policy (CSP)
- Rate limiting (100 req/min per IP)
- Input validation and sanitization
- Request body size limits
- Dotfile access prevention
- X-Powered-By header removal

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the full security analysis.

## License

MIT
