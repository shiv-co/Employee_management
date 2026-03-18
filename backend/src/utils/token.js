const jwt = require('jsonwebtoken');
const env = require('../config/env');

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtAccessSecret, {
    expiresIn: '1h'
  });

const createRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, env.jwtRefreshSecret, {
    expiresIn: '7d'
  });

module.exports = {
  createAccessToken,
  createRefreshToken
};
