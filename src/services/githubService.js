const axios = require('axios');
require('dotenv').config();

const GITHUB_API_BASE = 'https://api.github.com';

const githubClient = axios.create({
  baseURL: GITHUB_API_BASE,
  timeout: 10000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  },
});

class GitHubNotFoundError extends Error {
  constructor(username) {
    super(`GitHub user "${username}" was not found.`);
    this.name = 'GitHubNotFoundError';
    this.statusCode = 404;
  }
}

class GitHubRateLimitError extends Error {
  constructor() {
    super('GitHub API rate limit exceeded. Try again later or set a GITHUB_TOKEN.');
    this.name = 'GitHubRateLimitError';
    this.statusCode = 429;
  }
}

/**
 * Fetches the base profile object for a username.
 */
async function fetchUserProfile(username) {
  try {
    const { data } = await githubClient.get(`/users/${encodeURIComponent(username)}`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) throw new GitHubNotFoundError(username);
    if (err.response?.status === 403) throw new GitHubRateLimitError();
    throw err;
  }
}

/**
 * Fetches all public repos for a user, following pagination.
 * GitHub caps page size at 100; we walk pages until exhausted.
 */
async function fetchAllRepos(username) {
  const repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await githubClient.get(
      `/users/${encodeURIComponent(username)}/repos`,
      { params: { per_page: perPage, page, type: 'owner', sort: 'pushed' } }
    );
    repos.push(...data);
    if (data.length < perPage) break;
    page += 1;
    // Safety valve: GitHub profiles with thousands of repos shouldn't hang the request forever.
    if (page > 20) break;
  }

  return repos;
}

/**
 * Computes derived insights from the raw profile + repo list.
 * This is the "value add" layer beyond just mirroring GitHub's API.
 */
function computeInsights(profile, repos) {
  const ownedRepos = repos.filter((r) => !r.fork);
  const forkedRepos = repos.filter((r) => r.fork);
  const archivedRepos = repos.filter((r) => r.archived);

  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const totalWatchers = repos.reduce((sum, r) => sum + (r.watchers_count || 0), 0);

  // Language frequency map (counts repos per language, ignoring nulls)
  const languageCounts = {};
  for (const repo of repos) {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  }
  const topLanguagesSorted = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topLanguagesJson = Object.fromEntries(topLanguagesSorted);
  const mostUsedLanguage = topLanguagesSorted[0]?.[0] || null;

  // Most-starred repo
  let mostStarredRepo = null;
  for (const repo of repos) {
    if (!mostStarredRepo || (repo.stargazers_count || 0) > (mostStarredRepo.stargazers_count || 0)) {
      mostStarredRepo = repo;
    }
  }

  // Most recent push across all repos
  const lastPushed = repos.reduce((latest, r) => {
    if (!r.pushed_at) return latest;
    const d = new Date(r.pushed_at);
    return !latest || d > latest ? d : latest;
  }, null);

  const accountCreatedAt = new Date(profile.created_at);
  const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const followersToFollowingRatio =
    profile.following > 0
      ? Number((profile.followers / profile.following).toFixed(2))
      : Number(profile.followers || 0);

  const avgStarsPerRepo =
    ownedRepos.length > 0 ? Number((totalStars / ownedRepos.length).toFixed(2)) : 0;

  // A simple composite "activity score" — weighted blend of reach (followers/stars)
  // and output (repos), normalized with logs so a handful of mega-popular repos
  // don't completely dominate the score. This is a heuristic, not a GitHub metric.
  const activityScore = Number(
    (
      Math.log10(profile.followers + 1) * 10 +
      Math.log10(totalStars + 1) * 8 +
      Math.log10(ownedRepos.length + 1) * 5 +
      Math.log10(totalForks + 1) * 4
    ).toFixed(2)
  );

  return {
    totalStars,
    totalForks,
    totalWatchers,
    mostUsedLanguage,
    topLanguagesJson,
    mostStarredRepoName: mostStarredRepo?.name || null,
    mostStarredRepoStars: mostStarredRepo?.stargazers_count || 0,
    forkedReposCount: forkedRepos.length,
    originalReposCount: ownedRepos.length,
    archivedReposCount: archivedRepos.length,
    accountAgeDays,
    followersToFollowingRatio,
    avgStarsPerRepo,
    activityScore,
    lastRepoPushedAt: lastPushed,
  };
}

/**
 * Top-level orchestrator: fetch profile + repos, compute insights, return a flat object
 * ready to be persisted.
 */
async function analyzeProfile(username) {
  const profile = await fetchUserProfile(username);
  const repos = await fetchAllRepos(username);
  const insights = computeInsights(profile, repos);

  return { profile, insights };
}

module.exports = {
  analyzeProfile,
  fetchUserProfile,
  fetchAllRepos,
  computeInsights,
  GitHubNotFoundError,
  GitHubRateLimitError,
};
