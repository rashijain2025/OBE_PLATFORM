const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const outcomeController = require('../controllers/outcomeController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/cos?courseId=...
 * @desc    List COs for a course
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => outcomeController.list(req, res, next));

/**
 * @route   GET /api/cos/:id
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => outcomeController.getOne(req, res, next));

/**
 * @route   POST /api/cos
 * @desc    Create a Course Outcome
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.post('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => outcomeController.create(req, res, next));

/**
 * @route   PUT /api/cos/:id
 * @desc    Update a Course Outcome
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.put('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => outcomeController.update(req, res, next));

/**
 * @route   DELETE /api/cos/:id
 * @desc    Delete a Course Outcome
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.delete('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => outcomeController.remove(req, res, next));

module.exports = router;
