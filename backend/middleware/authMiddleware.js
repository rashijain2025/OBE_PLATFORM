const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Protect routes — verify JWT and attach user to request
 * @usage   router.get('/protected', protect, handler)
 *
 * Expects header:  Authorization: Bearer <token>
 * On success:      req.user = User document (without password)
 * On failure:      401 Unauthorized
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // ── 1. Extract token from Authorization header ──────────────────
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401);
            return next(new Error('Not authorized — no token provided.'));
        }

        // ── 2. Verify token ────────────────────────────────────────────
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ── 3. Fetch user from DB (exclude password) ───────────────────
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(401);
            return next(new Error('Not authorized — user no longer exists.'));
        }

        if (!user.isActive) {
            res.status(403);
            return next(new Error('Your account has been deactivated. Please contact the administrator.'));
        }

        // ── 4. Attach user to request ──────────────────────────────────
        req.user = user;
        next();
    } catch (err) {
        // JWT errors: TokenExpiredError, JsonWebTokenError, NotBeforeError
        if (err.name === 'TokenExpiredError') {
            res.status(401);
            return next(new Error('Not authorized — token has expired.'));
        }
        if (err.name === 'JsonWebTokenError') {
            res.status(401);
            return next(new Error('Not authorized — invalid token.'));
        }
        next(err);
    }
};

module.exports = { protect };
