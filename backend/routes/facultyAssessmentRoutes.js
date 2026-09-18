const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMyAssessments } = require('../controllers/assessmentController');

const router = express.Router();

router.use(protect);

// GET /api/assessments — lists all assessments across courses assigned to logged-in faculty
router.get('/', getMyAssessments);

module.exports = router;
