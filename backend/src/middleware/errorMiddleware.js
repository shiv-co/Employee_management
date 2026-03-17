const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFound = (_req, _res, next) => {
  next(new ApiError(404, 'Route not found'));
};

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (env.isDevelopment && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = {
  notFound,
  errorHandler
};
