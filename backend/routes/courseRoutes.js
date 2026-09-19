const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMyCourses, getCourseById } = require('../controllers/courseController');

const router = express.Router();

// GET /api/courses/my-courses — Get faculty's assigned courses
router.get('/my-courses', protect, getMyCourses);

// GET /api/courses/:courseId — Get a single course by ID
router.get('/:courseId', protect, getCourseById);

const outcomeRoutes = require('./outcomeRoutes');
const assessmentRoutes = require('./assessmentRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const attainmentRoutes = require('./attainmentRoutes');
const reportRoutes = require('./reportRoutes');

// Re-route into other resource routers
router.use('/:courseId/outcomes', outcomeRoutes);
router.use('/:courseId/assessments', assessmentRoutes);
router.use('/:courseId/students', enrollmentRoutes);
router.use('/:courseId/attainment', attainmentRoutes);
router.use('/:courseId/report', reportRoutes);

module.exports = router;
