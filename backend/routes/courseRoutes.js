const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const courseController = require('../controllers/courseController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/courses
 * @desc    List courses — scoped by role (faculty sees only their own)
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.list(req, res, next));

/**
 * @route   GET /api/courses/progress
 * @desc    Setup progress for every visible course (faculty: own, coordinator: department, admin: all)
 * @access  Admin, Coordinator, Faculty
 */
router.get('/progress', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.progressList(req, res, next));

/**
 * @route   GET /api/courses/:id
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.getOne(req, res, next));

/**
 * @route   GET /api/courses/:id/details
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id/details', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.getDetails(req, res, next));

/**
 * @route   GET /api/courses/:id/copy-sources
 * @desc    Earlier offerings whose setup can be copied into this course
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.get('/:id/copy-sources', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.copySources(req, res, next));

/**
 * @route   POST /api/courses/:id/copy-setup
 * @desc    Copy COs, assessments, question papers and CO-PO/PSO mappings from an earlier offering
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.post('/:id/copy-setup', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => courseController.copySetup(req, res, next));

/**
 * @route   GET /api/courses/:id/predictions
 * @desc    Get ML early warning predictions for a course
 * @access  Admin, Coordinator, Faculty (must own course)
 */
const predictionController = require('../controllers/predictionController');
router.get('/:id/predictions', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => predictionController.getCoursePredictions(req, res, next));

/**
 * @route   POST /api/courses
 * @access  Admin, Coordinator
 */
router.post('/', authorize('admin', 'coordinator'), (req, res, next) => courseController.create(req, res, next));

/**
 * @route   PUT /api/courses/:id
 * @access  Admin, Coordinator
 */
router.put('/:id', authorize('admin', 'coordinator'), (req, res, next) => courseController.update(req, res, next));

/**
 * @route   DELETE /api/courses/:id
 * @access  Admin, Coordinator
 */
router.delete('/:id', authorize('admin', 'coordinator'), (req, res, next) => courseController.remove(req, res, next));

module.exports = router;
