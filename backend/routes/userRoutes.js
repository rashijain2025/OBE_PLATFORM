const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// All user management routes require authentication
router.use(protect);

/**
 * @route   GET /api/users
 * @desc    List all users (filterable by ?role=)
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => userController.list(req, res, next));

/**
 * @route   GET /api/users/class-lists
 * @desc    Class lists (programme + batch + section) with student counts
 * @access  Admin, Coordinator (own department)
 */
router.get('/class-lists', authorize('admin', 'coordinator'), (req, res, next) => userController.listClassLists(req, res, next));

/**
 * @route   GET /api/users/class-lists/students?programmeId=&batch=&section=
 * @access  Admin, Coordinator (own department)
 */
router.get('/class-lists/students', authorize('admin', 'coordinator'), (req, res, next) => userController.listClassStudents(req, res, next));

/**
 * @route   POST /api/users/class-lists
 * @desc    Upload a class list; creates or updates student records by roll number
 * @access  Admin, Coordinator (own department)
 */
router.post('/class-lists', authorize('admin', 'coordinator'), (req, res, next) => userController.uploadClassList(req, res, next));

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => userController.getOne(req, res, next));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile (not password)
 * @access  Admin, Coordinator
 */
router.put('/:id', authorize('admin', 'coordinator'), (req, res, next) => userController.update(req, res, next));

/**
 * @route   PATCH /api/users/:id/reset-password
 * @desc    Admin resets a user's password
 * @access  Admin
 */
router.patch('/:id/reset-password', authorize('admin'), (req, res, next) => userController.resetPassword(req, res, next));

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Soft-deactivate a user account
 * @access  Admin
 */
router.patch('/:id/deactivate', authorize('admin'), (req, res, next) => userController.deactivate(req, res, next));

/**
 * @route   DELETE /api/users/:id
 * @desc    Permanently delete a user
 * @access  Admin
 */
router.delete('/:id', authorize('admin'), (req, res, next) => userController.remove(req, res, next));

/**
 * @route   POST /api/users/bulk-students
 * @desc    Bulk import student data records
 * @access  Admin, Coordinator
 */
router.post('/bulk-students', authorize('admin', 'coordinator'), (req, res, next) => userController.bulkImportStudents(req, res, next));

module.exports = router;
