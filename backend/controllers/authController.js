const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validateRegisterInput, validateLoginInput } = require('../validations/authValidation');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // ── 1. Validate input ────────────────────────────────────────────────
        const { valid, errors } = validateRegisterInput({ name, email, password, role });
        if (!valid) {
            res.status(400);
            return next(new Error(errors.join(' ')));
        }

        // ── 2. Check for duplicate email ─────────────────────────────────────
        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            res.status(409); // 409 Conflict — resource already exists
            return next(new Error('An account with this email address already exists.'));
        }

        // ── 3. Create user ───────────────────────────────────────────────────
        // Password hashing is handled by the User model pre-save hook.
        // Never hash here — that would double-hash and corrupt the password.
        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            ...(role && { role: role.toLowerCase() }),
        });

        // ── 4. Return safe response (no password) ────────────────────────────
        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || null,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        });
    } catch (err) {
        // Mongoose duplicate key error (race condition safety net)
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('An account with this email address already exists.'));
        }
        next(err);
    }
};

/**
 * @desc    Login user and return JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // ── 1. Validate input ────────────────────────────────────────────────
        const { valid, errors } = validateLoginInput({ email, password });
        if (!valid) {
            res.status(400);
            return next(new Error(errors.join(' ')));
        }

        // ── 2. Find user — explicitly select password for comparison ─────────
        // password has select:false on the schema, so we must opt-in here only.
        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

        // ── 3. Check user exists ─────────────────────────────────────────────
        // Deliberately use the SAME generic message for both "user not found"
        // and "wrong password" — prevents email enumeration attacks.
        if (!user) {
            res.status(401);
            return next(new Error('Invalid email or password.'));
        }

        // ── 4. Check account is active ───────────────────────────────────────
        if (!user.isActive) {
            res.status(403);
            return next(new Error('Your account has been deactivated. Please contact the administrator.'));
        }

        // ── 5. Compare password ──────────────────────────────────────────────
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            res.status(401);
            return next(new Error('Invalid email or password.'));
        }

        // ── 6. Generate JWT ──────────────────────────────────────────────────
        const token = generateToken(user);

        // ── 7. Return safe response ──────────────────────────────────────────
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department || null,
                isActive: user.isActive,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { registerUser, loginUser };
