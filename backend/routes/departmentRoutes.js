const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const departmentController = require('../controllers/departmentController');

const router = express.Router();

// All department routes require authentication
router.use(protect);

/**
 * @route   GET /api/departments
 * @desc    List all departments
 * @access  Authenticated
 */
router.get('/', (req, res, next) => departmentController.list(req, res, next));

/**
 * @route   GET /api/departments/:id
 * @desc    Get a single department
 * @access  Authenticated
 */
router.get('/:id', (req, res, next) => departmentController.getOne(req, res, next));

/**
 * @route   POST /api/departments
 * @desc    Create a department
 * @access  Admin
 */
router.post('/', authorize('admin'), (req, res, next) => departmentController.create(req, res, next));

/**
 * @route   PUT /api/departments/:id
 * @desc    Update a department
 * @access  Admin
 */
router.put('/:id', authorize('admin'), (req, res, next) => departmentController.update(req, res, next));

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete a department
 * @access  Admin
 */
router.delete('/:id', authorize('admin'), (req, res, next) => departmentController.remove(req, res, next));

module.exports = router;
