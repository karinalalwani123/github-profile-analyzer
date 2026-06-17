const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireApiKey } = require('../middleware/auth');

// Order matters: static/longer paths before the generic :username param route.

// List all stored profiles (with pagination, sorting, search) — open, read-only
router.get('/', profileController.listProfiles);

// Fetch from GitHub, compute insights, store/update in MySQL — protected
router.post('/:username', requireApiKey, profileController.analyzeAndStoreProfile);

// Get historical analysis snapshots for one profile — open, read-only
router.get('/:username/history', profileController.getProfileHistory);

// Get a single stored profile (DB read only, no GitHub call) — open, read-only
router.get('/:username', profileController.getProfile);

// Delete a stored profile — protected
router.delete('/:username', requireApiKey, profileController.deleteProfile);

module.exports = router;
