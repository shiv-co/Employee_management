const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { createAccessToken, createRefreshToken } = require('../utils/token');
const env = require('../config/env');
const { toSafeUser, normalizePhoneNumber, validatePhoneNumber } = require('./employeeController');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issueTokens = async (user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const payload = jwt.decode(refreshToken);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(payload.exp * 1000)
  });

  return { accessToken, refreshToken };
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const tokens = await issueTokens(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: toSafeUser(user),
      ...tokens
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (_error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const storedToken = await RefreshToken.findOne({
    tokenHash: hashToken(refreshToken),
    userId: payload.sub,
    revokedAt: null
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token is not recognized');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User is inactive');
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = await issueTokens(user);

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: {
      ...tokens,
      user: toSafeUser(user)
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: toSafeUser(req.user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  const allowedFields = ['name', 'department', 'designation', 'mobileNumber', 'dob'];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, 'mobileNumber')) {
    updates.mobileNumber = normalizePhoneNumber(updates.mobileNumber || '');
    validatePhoneNumber(updates.mobileNumber);
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  }).select('-passwordHash');

  res.status(200).json({ success: true, message: 'Profile updated', data: toSafeUser(user) });
});

module.exports = {
  login,
  refresh,
  logout,
  me,
  updateMe
};
