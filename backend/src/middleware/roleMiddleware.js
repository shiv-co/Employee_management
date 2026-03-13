const ApiError = require('../utils/ApiError');

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Forbidden: insufficient permissions'));
  }

  return next();
};

module.exports = authorize;
