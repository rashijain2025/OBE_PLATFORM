const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getCourseReport } = require('../controllers/reportController');

const router = express.Router({ mergeParams: true });

// GET /api/courses/:courseId/report
router.get('/', protect, getCourseReport);

module.exports = router;
