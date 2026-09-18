const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for an authenticated user.
 *
 * Payload contains ONLY the minimum identity needed:
 *   - id:   MongoDB _id  → to look up the full user on protected routes
 *   - role: user role    → for fast role checks in middleware without a DB hit
 *
 * We deliberately exclude: name, email, password, department, isActive.
 * The less data in a JWT, the smaller the token and the lower the exposure risk
 * if a token is ever intercepted.
 *
 * @param {Object} user - Mongoose User document
 * @returns {string} Signed JWT string
 */
const generateToken = (user) => {
    const payload = {
        id: user._id,
        role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

module.exports = generateToken;
