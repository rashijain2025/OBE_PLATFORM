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

// Re-route into other resource routers
router.use('/:courseId/outcomes', outcomeRoutes);
router.use('/:courseId/assessments', assessmentRoutes);

module.exports = router;
