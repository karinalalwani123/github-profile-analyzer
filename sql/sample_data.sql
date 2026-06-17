-- ============================================================
-- Sample seed data (optional) — demonstrates the shape of
-- stored rows. Safe to skip; the app populates this table
-- automatically when you call POST /api/profiles/:username
-- ============================================================

USE github_analyzer;

INSERT INTO profiles (
  github_id, username, name, avatar_url, profile_url, bio, company, location,
  blog, twitter_username, hireable, public_repos_count, public_gists_count,
  followers_count, following_count, total_stars_received, total_forks_received,
  total_watchers_received, most_used_language, top_languages_json,
  most_starred_repo_name, most_starred_repo_stars, forked_repos_count,
  original_repos_count, archived_repos_count, account_age_days,
  followers_to_following_ratio, avg_stars_per_repo, activity_score,
  last_repo_pushed_at, github_created_at, github_updated_at, analyzed_at
) VALUES (
  583231, 'octocat', 'The Octocat', 'https://avatars.githubusercontent.com/u/583231?v=4',
  'https://github.com/octocat', 'GitHub mascot account', 'GitHub', 'San Francisco',
  NULL, NULL, FALSE, 8, 8, 18000, 9, 1200, 800, 1200, 'Ruby',
  '{"Ruby": 4, "JavaScript": 2, "Shell": 2}', 'Spoon-Knife', 12000, 1, 7, 0, 5700,
  2000.00, 150.00, 87.50, '2024-01-01 12:00:00', '2011-01-25 18:44:36',
  '2024-01-01 12:00:00', NOW()
);
