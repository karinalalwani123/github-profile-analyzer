/**
 * Simple shared-secret API key check for write operations (POST/DELETE).
 * Read endpoints (GET) stay open so the live API can be shared for
 * browsing/testing without exposing data-mutating actions.
 *
 * Usage: set API_KEY in .env, then send requests with header:
 *   x-api-key: <your key>
 *
 * If API_KEY is not set in .env, this middleware is a no-op (open access) —
 * useful for local dev — but logs a warning so it's not silently insecure
 * in a deployed environment.
 */
function requireApiKey(req, res, next) {
  const configuredKey = process.env.API_KEY;

  if (!configuredKey) {
    console.warn(
      '⚠️  API_KEY is not set in .env — write endpoints are UNPROTECTED. Set API_KEY before deploying publicly.'
    );
    return next();
  }

  const providedKey = req.header('x-api-key');

  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid API key. Include a valid "x-api-key" header.',
    });
  }

  return next();
}

module.exports = { requireApiKey };
