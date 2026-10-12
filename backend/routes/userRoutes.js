const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// All user management routes are Admin-only
router.use(protect, authorize('admin'));

/**
 * @route   GET /api/users
 * @desc    List all users (filterable by ?role=)
 * @access  Admin
 */
router.get('/', (req, res, next) => userController.list(req, res, next));

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Admin
 */
router.get('/:id', (req, res, next) => userController.getOne(req, res, next));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile (not password)
 * @access  Admin
 */
router.put('/:id', (req, res, next) => userController.update(req, res, next));

/**
 * @route   PATCH /api/users/:id/reset-password
 * @desc    Admin resets a user's password
 * @access  Admin
 */
router.patch('/:id/reset-password', (req, res, next) => userController.resetPassword(req, res, next));

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Soft-deactivate a user account
 * @access  Admin
 */
router.patch('/:id/deactivate', (req, res, next) => userController.deactivate(req, res, next));

/**
 * @route   DELETE /api/users/:id
 * @desc    Permanently delete a user
 * @access  Admin
 */
router.delete('/:id', (req, res, next) => userController.remove(req, res, next));

/**
 * @route   POST /api/users/bulk-students
 * @desc    Bulk import student data records
 * @access  Admin
 */
router.post('/bulk-students', (req, res, next) => userController.bulkImportStudents(req, res, next));

module.exports = router;
