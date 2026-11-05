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
 * @route   GET /api/departments/catalog
 * @desc    The fixed list of Schools / Centres, marking which already exist
 * @access  Authenticated
 */
router.get('/catalog', (req, res, next) => departmentController.catalog(req, res, next));

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
 * @route   GET /api/departments/:id/obe-targets
 * @desc    Department-wide CO targets (Target Marks %, Attainment Goal %)
 * @access  Authenticated
 */
router.get('/:id/obe-targets', (req, res, next) => departmentController.getObeTargets(req, res, next));

/**
 * @route   PUT /api/departments/:id/obe-targets
 * @desc    Set department CO targets, optionally applying them to existing COs
 * @access  Admin, Coordinator (own department)
 */
router.put('/:id/obe-targets', authorize('admin', 'coordinator'), (req, res, next) => departmentController.updateObeTargets(req, res, next));

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete a department
 * @access  Admin
 */
router.delete('/:id', authorize('admin'), (req, res, next) => departmentController.remove(req, res, next));

module.exports = router;
