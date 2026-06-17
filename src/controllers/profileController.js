const githubService = require('../services/githubService');
const profileModel = require('../models/profileModel');

const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(username);
}

/**
 * POST /api/profiles/:username
 * Fetches the latest data from GitHub, computes insights, and stores/updates it.
 */
async function analyzeAndStoreProfile(req, res, next) {
  try {
    const { username } = req.params;

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub username format.',
      });
    }

    const { profile, insights } = await githubService.analyzeProfile(username);
    const profileId = await profileModel.upsertProfile(profile, insights);
    const stored = await profileModel.getProfileByUsername(profile.login);

    return res.status(200).json({
      success: true,
      message: `Profile "${profile.login}" analyzed and stored successfully.`,
      data: stored,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles
 * Lists all stored, previously-analyzed profiles with pagination/sorting/search.
 */
async function listProfiles(req, res, next) {
  try {
    const { page = 1, limit = 20, sortBy = 'analyzed_at', order = 'DESC', search = '' } = req.query;

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);

    const result = await profileModel.listProfiles({
      page: safePage,
      limit: safeLimit,
      sortBy,
      order,
      search,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles/:username
 * Returns the most recently stored analysis for a single profile.
 * Does NOT call GitHub — purely reads from our DB.
 */
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await profileModel.getProfileByUsername(username);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `No stored analysis found for "${username}". Try POST /api/profiles/${username} first.`,
      });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles/:username/history
 * Returns the historical snapshots recorded each time this profile was analyzed.
 */
async function getProfileHistory(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await profileModel.getProfileByUsername(username);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `No stored analysis found for "${username}".`,
      });
    }

    const history = await profileModel.getProfileHistory(username);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/profiles/:username
 * Removes a stored profile and its history (cascades via FK).
 */
async function deleteProfile(req, res, next) {
  try {
    const { username } = req.params;
    const deleted = await profileModel.deleteProfile(username);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `No stored analysis found for "${username}".`,
      });
    }

    return res.status(200).json({ success: true, message: `Profile "${username}" deleted.` });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  analyzeAndStoreProfile,
  listProfiles,
  getProfile,
  getProfileHistory,
  deleteProfile,
};
