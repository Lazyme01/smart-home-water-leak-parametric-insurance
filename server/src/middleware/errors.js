function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
  const message = status === 500 ? 'Internal server error' : error.code === 11000 ? 'A record with these details already exists' : error.message;
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
