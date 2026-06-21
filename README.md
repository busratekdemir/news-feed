# Personalized News Feed

A full-stack personalized news feed application built for the Software Intern task. Users can register, log in, choose news interests, search stories, bookmark articles locally, and read a feed that changes based on selected categories and reading behavior.

NewsAPI requests are made only from controlled backend sync jobs. API keys are stored in backend environment variables and are never exposed to the React frontend. User-facing news reads come only from the local SQLite database.

## Technologies

- Frontend: React, Vite, React Router, Axios, Lucide React
- Backend: Node.js, Express, JWT, bcryptjs
- Database: SQLite with Prisma
- External API: NewsAPI
- Authentication: Backend-issued JWT stored by the frontend and sent as a Bearer token

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

The backend runs on `http://localhost:5000` by default.

Required backend `.env` values:

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
NEWS_API_KEY="replace-with-your-newsapi-key"
NEWS_API_COUNTRY="us"
NEWS_API_DAILY_REQUEST_LIMIT=90
NEWS_CACHE_REFRESH_INTERVAL_MINUTES=360
NEWS_SYNC_ON_START=false
PORT=5000
```

Populate or refresh the local news database with:

```bash
npm run sync:news
```

The sync job skips categories that were refreshed within `NEWS_CACHE_REFRESH_INTERVAL_MINUTES` and records every NewsAPI call in SQLite. By default it stops before 90 calls per UTC day, leaving room below NewsAPI's free 100-request limit. Use `npm run sync:news -- --force` only when you intentionally want to refresh every category, still under the daily cap.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend runs on the Vite dev server, usually `http://localhost:5173`.

Frontend `.env` value:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

This value is not a secret. It only tells the React app where the backend API is running.

## API Endpoints

- `POST /api/auth/register`: Create a user account. Passwords are hashed before storage.
- `POST /api/auth/login`: Authenticate a user and return a JWT.
- `GET /api/user/preferences`: Return the authenticated user's selected categories.
- `PUT /api/user/preferences`: Update the authenticated user's selected categories.
- `GET /api/news/categories`: Return supported NewsAPI categories.
- `GET /api/news`: Return personalized news for the authenticated user from SQLite only.
- `POST /api/news/interactions`: Store article clicks, reading progress, and bookmark events.

Private endpoints require:

```http
Authorization: Bearer <jwt-token>
```

## Security Notes

- Passwords are hashed with `bcryptjs`.
- JWT authentication is handled on the Express backend.
- Private user and news routes are protected by JWT middleware.
- The NewsAPI key is read only from `backend/.env`.
- The frontend never calls NewsAPI directly and never receives the NewsAPI key.
- NewsAPI responses are stored in SQLite by category through the backend sync job.
- User-facing `GET /api/news` requests never call NewsAPI, even when the stored data is stale or empty.
- NewsAPI sync calls are counted in SQLite and capped by `NEWS_API_DAILY_REQUEST_LIMIT`.
- `.env` files are ignored by Git. Commit only `.env.example` files.

## Personalization

Each user has a comma-separated list of category preferences stored in SQLite through Prisma. During registration, users start with `general`. On the Categories page, users select one or more supported NewsAPI categories and save them with `PUT /api/user/preferences`.

When Home, Breaking News, Explore, or News Detail loads stories, the frontend calls `GET /api/news`. The backend reads the authenticated user's saved preferences, loads stored category results from SQLite, combines the results, removes duplicate stories, sorts by publish date, and returns the article list. This request path never calls NewsAPI. If the local database is empty, the app returns an empty feed until `npm run sync:news` populates it.

The backend recommendation engine stores article interactions in SQLite and updates a user profile after every click, detail view, reading-progress event, and bookmark. The profile contains decayed category, source, keyword, and entity weights, plus recent and long-term interests. Older behavior gradually fades through exponential decay, so new habits can replace old ones.

Recommendation ranking uses weighted signals:

```text
score = 0.35 category similarity
      + 0.25 keyword/entity similarity
      + 0.15 source preference
      + 0.15 recency
      + 0.10 popularity
```

The backend also injects exploration stories and lightweight collaborative filtering from users with similar reading histories. Home displays Personalized For You, Trending, Because You Read, Readers Like You, and Discover Something New sections.

Article detail routes use stable backend-generated IDs based on `title + publishedAt + source`. The frontend also stores clicked articles locally before navigation so `/news/:id` can still show the exact clicked story if NewsAPI returns a changed list later.

Saved News is client-side persistence: when a user bookmarks an article, the frontend stores a full article copy in localStorage with `id`, `title`, `description`, `source`, `url`, `imageUrl`, `category`, `publishedAt`, and `savedAt`. Feed refreshes never delete saved articles.

## User Features

- Secure registration and login
- Personalized home feed
- Reading-behavior-based feed ranking
- Backend-stored interaction tracking and decayed interest profiles
- Category selection and saved preferences
- Backend-only controlled NewsAPI sync
- SQLite article storage by category
- Daily NewsAPI request cap
- Stable article detail routes
- Clickable news cards with `/news/:id` detail routes
- Related story links on article detail pages
- Recommendation explanations generated from interaction history
- Load More button on Home
- Saved News page backed by localStorage
- Navbar search filtering
- Full-copy localStorage article bookmarks
- Fallback images for missing or broken NewsAPI images
- Responsive modern UI

## Build Check

```bash
cd frontend
npm run build
```

## Start Check

```bash
cd backend
npm start
```
