const notFound = (req, res) => {
  res.status(404).json({
    error: "NotFound",
    code: 404,
    detail: `Route ${req.originalUrl} not found`,
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    error: statusCode === 500 ? "ServerError" : err.name || "Error",
    code: statusCode,
    detail: err.message || "An unexpected error occurred",
  });
};

module.exports = { notFound, errorHandler };
