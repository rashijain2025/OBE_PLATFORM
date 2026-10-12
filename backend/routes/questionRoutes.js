const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const questionController = require('../controllers/questionController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/questions?assessmentId=...
 * @desc    List questions for an assessment
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => questionController.list(req, res, next));

/**
 * @route   GET /api/questions/:id
 * @access  Admin, Coordinator, Faculty
 */
router.get('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => questionController.getOne(req, res, next));

/**
 * @route   POST /api/questions
 * @desc    Create question with Question→CO mapping
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.post('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => questionController.create(req, res, next));

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.put('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => questionController.update(req, res, next));

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.delete('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => questionController.remove(req, res, next));

module.exports = router;
