const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const attainmentController = require('../controllers/attainmentController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/attainment?courseId=...&target=40
 * @desc    Calculate Course CO Attainment (student-wise & class-wise)
 * @access  Admin, Coordinator, Faculty
 */
router.get('/', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => attainmentController.getCourseAttainment(req, res, next));

/**
 * @route   GET /api/attainment/report?courseId=...&target=40
 * @desc    Get complete faculty course attainment report
 * @access  Admin, Coordinator, Faculty
 */
router.get('/report', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => attainmentController.getReport(req, res, next));

/**
 * @route   GET /api/attainment/export?courseId=...&target=40
 * @desc    Export CO attainment report to CSV
 * @access  Admin, Coordinator, Faculty
 */
router.get('/export', authorize('admin', 'coordinator', 'faculty'), (req, res, next) => attainmentController.exportCSV(req, res, next));

module.exports = router;
