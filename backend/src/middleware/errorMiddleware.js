const ApiError = require('../utils/ApiError');

const notFound = (_req, _res, next) => {
  next(new ApiError(404, 'Route not found'));
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = {
  notFound,
  errorHandler
};
