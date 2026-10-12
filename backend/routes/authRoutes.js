const express = require('express');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Private (Admin only)
 */
router.post(
  '/register',
  protect,
  authorize('admin'),
  (req, res, next) => authController.register(req, res, next)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (Authenticated users)
 */
router.get('/me', protect, (req, res, next) => authController.getMe(req, res, next));

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change password for logged-in user (requires current password)
 * @access  Private (Authenticated users)
 */
router.patch('/change-password', protect, (req, res, next) => authController.changePassword(req, res, next));

module.exports = router;
