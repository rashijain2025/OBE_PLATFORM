const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getCourseAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    deleteAssessment,
} = require('../controllers/assessmentController');

// mergeParams: true allows access to :courseId from parent router
const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
    .get(getCourseAssessments)
    .post(createAssessment);

const { getAssessmentAttainment } = require('../controllers/attainmentController');

router.route('/:assessmentId')
    .get(getAssessmentById)
    .put(updateAssessment)
    .delete(deleteAssessment);

router.get('/:assessmentId/attainment', getAssessmentAttainment);

module.exports = router;
