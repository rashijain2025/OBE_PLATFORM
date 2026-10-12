const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const enrollmentController = require('../controllers/enrollmentController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/enrollments?courseId=
 * @desc    List enrollments for a course
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.list(req, res, next));

/**
 * @route   POST /api/enrollments
 * @desc    Enroll a single student
 * @access  Admin, Coordinator, Faculty
 */
router.post('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.enroll(req, res, next));

/**
 * @route   POST /api/enrollments/bulk
 * @desc    Bulk enroll students by roll-number list
 * @access  Admin, Coordinator, Faculty
 */
router.post('/bulk', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.bulkEnroll(req, res, next));

/**
 * @route   DELETE /api/enrollments/:id
 * @desc    Remove a single enrollment
 * @access  Admin, Coordinator, Faculty
 */
router.delete('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.remove(req, res, next));

module.exports = router;
