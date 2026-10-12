const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Get real counts per role
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', protect, authorize('admin', 'coordinator', 'faculty'), (req, res, next) => dashboardController.getStats(req, res, next));

module.exports = router;
