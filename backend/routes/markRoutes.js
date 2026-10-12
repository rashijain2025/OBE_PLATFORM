const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const markController = require('../controllers/markController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/marks?assessmentId=...
 * @desc    Get marks grid (students × questions)
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => markController.getGrid(req, res, next));

/**
 * @route   POST /api/marks/bulk
 * @desc    Bulk save marks for an assessment
 * @access  Admin, Coordinator, Faculty
 */
router.post('/bulk', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => markController.saveBulk(req, res, next));

/**
 * @route   POST /api/marks/csv-import
 * @desc    Import marks from CSV
 * @access  Admin, Coordinator, Faculty
 */
router.post('/csv-import', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => markController.importCSV(req, res, next));

module.exports = router;
