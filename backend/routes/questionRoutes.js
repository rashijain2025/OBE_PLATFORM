const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
} = require('../controllers/questionController');

// mergeParams: true allows access to :assessmentId from parent router
const router = express.Router({ mergeParams: true });

// All question routes are JWT-protected
router.use(protect);

router.route('/')
    .get(getQuestions)
    .post(createQuestion);

router.route('/:questionId')
    .put(updateQuestion)
    .delete(deleteQuestion);

module.exports = router;
