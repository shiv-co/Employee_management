const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    throw new ApiError(401, 'Unauthorized: token missing');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (_error) {
    throw new ApiError(401, 'Unauthorized: invalid token');
  }

  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Unauthorized: user not available');
  }

  req.user = user;
  next();
});

module.exports = protect;
