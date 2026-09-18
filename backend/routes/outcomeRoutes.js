const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getOutcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome,
} = require('../controllers/outcomeController');

// mergeParams: true allows access to :courseId defined in parent course router
const router = express.Router({ mergeParams: true });

// All outcome routes are protected and scoped to faculty courses
router.use(protect);

router.route('/')
    .get(getOutcomes)
    .post(createOutcome);

router.route('/:outcomeId')
    .put(updateOutcome)
    .delete(deleteOutcome);

module.exports = router;
