const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getCourseAttainment,
    updateAttainmentSettings,
} = require('../controllers/attainmentController');

const router = express.Router({ mergeParams: true });

router.use(protect);

// GET /api/courses/:courseId/attainment — Calculate CO attainment
router.get('/', getCourseAttainment);

// PATCH /api/courses/:courseId/attainment/settings — Update target percentage
router.patch('/settings', updateAttainmentSettings);

module.exports = router;
