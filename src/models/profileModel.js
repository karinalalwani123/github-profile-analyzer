const { pool } = require('../config/db');

/**
 * Maps a raw GitHub profile + computed insights object into the flat
 * column structure used by the `profiles` table.
 */
function toRow(profile, insights) {
  return {
    github_id: profile.id,
    username: profile.login,
    name: profile.name,
    avatar_url: profile.avatar_url,
    profile_url: profile.html_url,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    blog: profile.blog || null,
    twitter_username: profile.twitter_username,
    hireable: profile.hireable === null ? null : Boolean(profile.hireable),
    public_repos_count: profile.public_repos || 0,
    public_gists_count: profile.public_gists || 0,
    followers_count: profile.followers || 0,
    following_count: profile.following || 0,
    total_stars_received: insights.totalStars,
    total_forks_received: insights.totalForks,
    total_watchers_received: insights.totalWatchers,
    most_used_language: insights.mostUsedLanguage,
    top_languages_json: JSON.stringify(insights.topLanguagesJson),
    most_starred_repo_name: insights.mostStarredRepoName,
    most_starred_repo_stars: insights.mostStarredRepoStars,
    forked_repos_count: insights.forkedReposCount,
    original_repos_count: insights.originalReposCount,
    archived_repos_count: insights.archivedReposCount,
    account_age_days: insights.accountAgeDays,
    followers_to_following_ratio: insights.followersToFollowingRatio,
    avg_stars_per_repo: insights.avgStarsPerRepo,
    activity_score: insights.activityScore,
    last_repo_pushed_at: insights.lastRepoPushedAt
      ? new Date(insights.lastRepoPushedAt).toISOString().slice(0, 19).replace('T', ' ')
      : null,
    github_created_at: profile.created_at
      ? new Date(profile.created_at).toISOString().slice(0, 19).replace('T', ' ')
      : null,
    github_updated_at: profile.updated_at
      ? new Date(profile.updated_at).toISOString().slice(0, 19).replace('T', ' ')
      : null,
  };
}

/**
 * Inserts a new profile analysis, or updates the existing row for that
 * username (upsert), then writes a history snapshot.
 */
async function upsertProfile(profile, insights) {
  const row = toRow(profile, insights);
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const updateAssignments = columns
    .filter((c) => c !== 'username' && c !== 'github_id')
    .map((c) => `${c} = VALUES(${c})`)
    .concat('analyzed_at = CURRENT_TIMESTAMP')
    .join(', ');

  const insertSql = `
    INSERT INTO profiles (${columns.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updateAssignments}
  `;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(insertSql, Object.values(row));

    const [rows] = await conn.query('SELECT id FROM profiles WHERE username = ? LIMIT 1', [
      row.username,
    ]);
    const profileId = rows[0].id;

    await conn.query(
      `INSERT INTO profile_analysis_history
        (profile_id, username, public_repos_count, followers_count, following_count, total_stars_received, activity_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        row.username,
        row.public_repos_count,
        row.followers_count,
        row.following_count,
        row.total_stars_received,
        row.activity_score,
      ]
    );

    await conn.commit();
    return profileId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getProfileByUsername(username) {
  const [rows] = await pool.query('SELECT * FROM profiles WHERE username = ? LIMIT 1', [
    username,
  ]);
  return rows[0] || null;
}

async function getProfileHistory(username, limit = 20) {
  const [rows] = await pool.query(
    `SELECT public_repos_count, followers_count, following_count, total_stars_received,
            activity_score, analyzed_at
     FROM profile_analysis_history
     WHERE username = ?
     ORDER BY analyzed_at DESC
     LIMIT ?`,
    [username, limit]
  );
  return rows;
}

/**
 * Lists profiles with pagination, optional search, and sortable column.
 */
async function listProfiles({ page = 1, limit = 20, sortBy = 'analyzed_at', order = 'DESC', search = '' }) {
  const allowedSortColumns = new Set([
    'analyzed_at',
    'followers_count',
    'public_repos_count',
    'total_stars_received',
    'activity_score',
    'username',
    'created_at',
  ]);
  const sortColumn = allowedSortColumns.has(sortBy) ? sortBy : 'analyzed_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE username LIKE ? OR name LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.query(
    `SELECT * FROM profiles ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM profiles ${whereClause}`,
    params
  );

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

async function deleteProfile(username) {
  const [result] = await pool.query('DELETE FROM profiles WHERE username = ?', [username]);
  return result.affectedRows > 0;
}

module.exports = {
  upsertProfile,
  getProfileByUsername,
  getProfileHistory,
  listProfiles,
  deleteProfile,
};
