const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const predictionController = require('../controllers/predictionController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/ml/model-info
 * @desc    Get ML model metadata and performance metrics
 * @access  Authenticated
 */
router.get('/model-info', (req, res, next) => predictionController.getModelInfo(req, res, next));

/**
 * @route   POST /api/ml/train
 * @desc    Trigger model retraining on synthetic or real historical data
 * @access  Admin only
 */
router.post('/train', authorize('admin'), (req, res, next) => predictionController.trainModel(req, res, next));

module.exports = router;
