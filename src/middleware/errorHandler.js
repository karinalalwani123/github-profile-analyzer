function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

module.exports = { notFoundHandler, errorHandler };
