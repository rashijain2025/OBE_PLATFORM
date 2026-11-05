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
 * @route   GET /api/enrollments/class-groups?courseId=
 * @desc    Class lists available for this course's programme
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.get('/class-groups', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.classGroups(req, res, next));

/**
 * @route   POST /api/enrollments/by-class
 * @desc    Enroll a whole class list (batch + section) into a course
 * @access  Admin, Coordinator, Faculty (must own course)
 */
router.post('/by-class', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.enrollClass(req, res, next));

/**
 * @route   DELETE /api/enrollments/:id
 * @desc    Remove a single enrollment
 * @access  Admin, Coordinator, Faculty
 */
router.delete('/:id', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => enrollmentController.remove(req, res, next));

module.exports = router;
