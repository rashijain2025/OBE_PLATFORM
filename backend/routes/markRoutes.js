const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getAssessmentMarks,
    saveAssessmentMarks,
} = require('../controllers/markController');

// mergeParams: true allows access to :assessmentId from parent router
const router = express.Router({ mergeParams: true });

// All marks endpoints require authentication
router.use(protect);

router.route('/')
    .get(getAssessmentMarks)
    .post(saveAssessmentMarks);

module.exports = router;
