const jwt = require('jsonwebtoken');
const env = require('../config/env');

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn
  });

const createRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn
  });

module.exports = {
  createAccessToken,
  createRefreshToken
};
