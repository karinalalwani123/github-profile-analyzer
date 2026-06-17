# GitHub Profile Analyzer

A backend service that fetches a GitHub user's public profile data via the
GitHub REST API, computes useful derived insights, and persists everything
to a MySQL database — with a small REST API on top to retrieve stored
analyses.

## Tech Stack

- Node.js
- Express.js
- MySQL (via `mysql2`)
- GitHub public REST API (`axios`)

## Features

- **Analyze & store** — `POST /api/profiles/:username` pulls the user's
  profile and full repo list from GitHub, computes insights, and
  upserts the result into MySQL.
- **List all profiles** — `GET /api/profiles` with pagination, sorting,
  and search.
- **Get one profile** — `GET /api/profiles/:username` reads straight from
  the DB (no GitHub call), so it's fast and doesn't burn rate limit.
- **Analysis history** — `GET /api/profiles/:username/history` returns a
  timeline of past snapshots, since every re-analysis is logged to an
  audit table — useful for tracking growth over time.
- **Delete a profile** — `DELETE /api/profiles/:username`.
- Input validation, centralized error handling, rate limiting, security
  headers (helmet), and CORS enabled out of the box.

### Derived insights computed (beyond raw GitHub fields)

| Insight | Description |
|---|---|
| `total_stars_received` / `total_forks_received` / `total_watchers_received` | Summed across all public repos |
| `most_used_language` / `top_languages_json` | Frequency count of repo languages |
| `most_starred_repo_name` / `most_starred_repo_stars` | The user's flagship repo |
| `forked_repos_count` / `original_repos_count` / `archived_repos_count` | Repo composition breakdown |
| `account_age_days` | Days since the GitHub account was created |
| `followers_to_following_ratio` | Simple reach indicator |
| `avg_stars_per_repo` | Stars normalized by repo count |
| `activity_score` | A weighted, log-scaled composite of followers, stars, repo count, and forks (see `computeInsights` in `src/services/githubService.js` for the exact formula) — a single sortable number to rank profiles by overall GitHub presence |
| `last_repo_pushed_at` | Most recent push timestamp across all repos, as a freshness signal |

## Project Structure

```
github-profile-analyzer/
├── src/
│   ├── config/db.js              # MySQL connection pool
│   ├── controllers/               # Request handlers
│   ├── services/githubService.js  # GitHub API calls + insight computation
│   ├── models/profileModel.js     # SQL queries (upsert, list, get, delete)
│   ├── routes/profileRoutes.js
│   ├── middleware/errorHandler.js
│   ├── utils/migrate.js           # Node-based schema migration runner
│   ├── app.js                     # Express app (middleware + routes)
│   └── server.js                  # Entry point
├── sql/
│   ├── schema.sql                 # Full database schema (source of truth)
│   └── sample_data.sql            # Optional example row
├── postman/
│   └── GitHub-Profile-Analyzer.postman_collection.json
├── .env.example
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- A running MySQL server (local, Docker, or a managed instance like
  PlanetScale / Railway / AWS RDS)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd github-profile-analyzer
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_analyzer
GITHUB_TOKEN=         # optional, see below
API_KEY=              # required before deploying publicly, see below
```

> **About `GITHUB_TOKEN`**: the GitHub API allows 60 unauthenticated
> requests/hour per IP, which is easy to hit since this app calls both
> `/users/:username` and `/users/:username/repos` (possibly paginated)
> per analysis. Create a free [Personal Access Token](https://github.com/settings/tokens)
> with **no scopes** (public data only) to raise the limit to 5,000/hour.

> **About `API_KEY`**: `GET` endpoints are open so you can share the live
> URL for read-only browsing/testing. `POST` (analyze) and `DELETE` are
> protected by a shared-secret API key, since anyone with the URL could
> otherwise burn your GitHub rate limit or delete stored data. Generate
> one with `openssl rand -hex 32` and set it before deploying. If left
> blank, write endpoints are open (fine for local dev only — the server
> logs a warning in this case).

### 3. Create the database schema

Either let MySQL CLI run it directly:

```bash
mysql -u root -p < sql/schema.sql
```

...or use the bundled Node migration script (reads the same file, useful
if you don't have the `mysql` CLI installed):

```bash
npm run migrate
```

### 4. Run the server

```bash
npm start          # production
npm run dev         # with nodemon auto-reload
```

The API will be available at `http://localhost:3000`.

### 5. Try it out

```bash
# Analyze and store a profile (requires API key)
curl -X POST http://localhost:3000/api/profiles/octocat \
  -H "x-api-key: your_api_key_here"

# List all stored profiles (open, no key needed)
curl http://localhost:3000/api/profiles

# Get one stored profile (open, no key needed)
curl http://localhost:3000/api/profiles/octocat

# Get its analysis history (open, no key needed)
curl http://localhost:3000/api/profiles/octocat/history
```

Or import `postman/GitHub-Profile-Analyzer.postman_collection.json` into
Postman and use the requests there.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | open | Health check |
| POST | `/api/profiles/:username` | **requires `x-api-key` header** | Fetch from GitHub, compute insights, upsert into MySQL |
| GET | `/api/profiles` | open | List stored profiles. Query params: `page`, `limit`, `sortBy`, `order`, `search` |
| GET | `/api/profiles/:username` | open | Get one stored profile (DB only) |
| GET | `/api/profiles/:username/history` | open | Get historical analysis snapshots |
| DELETE | `/api/profiles/:username` | **requires `x-api-key` header** | Delete a stored profile |

### Example response — `POST /api/profiles/octocat`

```json
{
  "success": true,
  "message": "Profile \"octocat\" analyzed and stored successfully.",
  "data": {
    "id": 1,
    "username": "octocat",
    "name": "The Octocat",
    "public_repos_count": 8,
    "followers_count": 18000,
    "following_count": 9,
    "total_stars_received": 1200,
    "most_used_language": "Ruby",
    "top_languages_json": "{\"Ruby\":4,\"JavaScript\":2,\"Shell\":2}",
    "most_starred_repo_name": "Spoon-Knife",
    "most_starred_repo_stars": 12000,
    "account_age_days": 5700,
    "followers_to_following_ratio": "2000.00",
    "activity_score": "87.50",
    "analyzed_at": "2026-06-17 06:50:00"
  }
}
```

## Database Schema

See [`sql/schema.sql`](./sql/schema.sql) for the full source of truth.
Summary:

- **`profiles`** — one row per analyzed username (upserted on
  re-analysis), holding raw GitHub fields plus all derived insight
  columns.
- **`profile_analysis_history`** — append-only log; one row is inserted
  every time a profile is (re)analyzed, enabling trend tracking over
  time via the `/history` endpoint.

## Deployment Notes

This service is stateless aside from its MySQL connection, so it deploys
cleanly to any Node host (Render, Railway, Fly.io, Heroku, an EC2 box,
etc.) paired with a managed MySQL instance. Steps are the same as local
setup: set the `.env` variables in your host's dashboard/secrets
manager, run `sql/schema.sql` against your production database once,
then start the app with `npm start`.

## Error Handling

All responses follow a consistent `{ success, data | error }` shape.
Known failure cases are mapped to sensible HTTP codes: `400` for a
malformed GitHub username, `404` for a GitHub user that doesn't exist or
hasn't been analyzed yet, `429` if GitHub's rate limit is hit, `500` for
unexpected errors.

## License

MIT
