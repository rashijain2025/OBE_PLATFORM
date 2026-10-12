const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const assessmentController = require('../controllers/assessmentController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/assessments?courseId=...
 * @desc    List assessments for a course
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => assessmentController.list(req, res, next));

/**
 * @route   GET /api/assessments/:id
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => assessmentController.getOne(req, res, next));

/**
 * @route   POST /api/assessments
 * @desc    Create an assessment
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.post('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => assessmentController.create(req, res, next));

/**
 * @route   PUT /api/assessments/:id
 * @desc    Update an assessment
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.put('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => assessmentController.update(req, res, next));

/**
 * @route   DELETE /api/assessments/:id
 * @desc    Delete an assessment
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.delete('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => assessmentController.remove(req, res, next));

module.exports = router;
