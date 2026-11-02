const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const invitationController = require('../controllers/invitationController');

const router = express.Router();

router.use(protect);
router.use(authorize('coordinator', 'admin'));

/**
 * @route   GET /api/faculty
 * @desc    Get faculty of own department with course counts
 * @access  Coordinator, Admin
 */
router.get('/', (req, res, next) => invitationController.listFaculty(req, res, next));

/**
 * @route   POST /api/faculty/:id/assign-courses
 * @desc    Assign programme courses to a faculty member
 * @access  Coordinator, Admin
 */
router.post('/:id/assign-courses', (req, res, next) => invitationController.assignCourses(req, res, next));

module.exports = router;
