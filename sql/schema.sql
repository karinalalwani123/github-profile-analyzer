-- ============================================================
-- GitHub Profile Analyzer - Database Schema
-- ============================================================
-- Run this file to create the database and all required tables.
-- Usage: mysql -u root -p < sql/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

-- ------------------------------------------------------------
-- Table: profiles
-- Stores the raw GitHub profile fields + derived insights for
-- the most recent analysis of each username.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Identity
  github_id               BIGINT UNSIGNED NOT NULL,
  username                VARCHAR(255) NOT NULL,
  name                     VARCHAR(255) DEFAULT NULL,
  avatar_url               VARCHAR(512) DEFAULT NULL,
  profile_url              VARCHAR(512) DEFAULT NULL,
  bio                      TEXT DEFAULT NULL,
  company                  VARCHAR(255) DEFAULT NULL,
  location                 VARCHAR(255) DEFAULT NULL,
  blog                     VARCHAR(512) DEFAULT NULL,
  twitter_username         VARCHAR(255) DEFAULT NULL,
  hireable                 BOOLEAN DEFAULT NULL,

  -- Raw GitHub counters
  public_repos_count       INT UNSIGNED DEFAULT 0,
  public_gists_count       INT UNSIGNED DEFAULT 0,
  followers_count          INT UNSIGNED DEFAULT 0,
  following_count          INT UNSIGNED DEFAULT 0,

  -- Derived insights (computed by our service from repo list)
  total_stars_received     INT UNSIGNED DEFAULT 0,
  total_forks_received     INT UNSIGNED DEFAULT 0,
  total_watchers_received  INT UNSIGNED DEFAULT 0,
  most_used_language       VARCHAR(100) DEFAULT NULL,
  top_languages_json       JSON DEFAULT NULL,         -- {"JavaScript": 12, "Python": 5, ...}
  most_starred_repo_name   VARCHAR(255) DEFAULT NULL,
  most_starred_repo_stars  INT UNSIGNED DEFAULT 0,
  forked_repos_count       INT UNSIGNED DEFAULT 0,
  original_repos_count     INT UNSIGNED DEFAULT 0,
  archived_repos_count     INT UNSIGNED DEFAULT 0,
  account_age_days         INT UNSIGNED DEFAULT 0,
  followers_to_following_ratio DECIMAL(10,2) DEFAULT 0.00,
  avg_stars_per_repo        DECIMAL(10,2) DEFAULT 0.00,
  activity_score            DECIMAL(10,2) DEFAULT 0.00, -- weighted composite score, see README
  last_repo_pushed_at        DATETIME DEFAULT NULL,

  -- GitHub timestamps
  github_created_at        DATETIME DEFAULT NULL,
  github_updated_at        DATETIME DEFAULT NULL,

  -- Bookkeeping
  analyzed_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_github_id (github_id),
  INDEX idx_followers (followers_count),
  INDEX idx_public_repos (public_repos_count),
  INDEX idx_activity_score (activity_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: profile_analysis_history
-- Keeps an append-only audit trail every time a profile is
-- (re)analyzed, so trends over time can be tracked.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_analysis_history (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  profile_id           INT UNSIGNED NOT NULL,
  username             VARCHAR(255) NOT NULL,
  public_repos_count   INT UNSIGNED DEFAULT 0,
  followers_count      INT UNSIGNED DEFAULT 0,
  following_count      INT UNSIGNED DEFAULT 0,
  total_stars_received INT UNSIGNED DEFAULT 0,
  activity_score       DECIMAL(10,2) DEFAULT 0.00,
  analyzed_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_history_profile
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
    ON DELETE CASCADE,
  INDEX idx_profile_id (profile_id),
  INDEX idx_username_history (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
