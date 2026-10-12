const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token
 * @param {Object} payload - Data to embed in the token
 * @returns {string} - Signed JWT
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_in_production';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token string
 * @returns {Object} - Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_in_production';
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
