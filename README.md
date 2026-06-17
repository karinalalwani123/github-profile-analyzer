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

