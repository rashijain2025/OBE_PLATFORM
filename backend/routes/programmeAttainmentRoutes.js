const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const programmeAttainmentController = require('../controllers/programmeAttainmentController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/programme-attainment/course/:courseId
 * @desc    Calculate PO and PSO attainment for a specific course
 * @access  Admin, Coordinator, Faculty
 */
router.get(
  '/course/:courseId',
  authorize('admin', 'coordinator', 'faculty'),
  (req, res, next) => programmeAttainmentController.getCoursePOAttainment(req, res, next)
);

/**
 * @route   GET /api/programme-attainment/export-csv/:programmeId
 * @desc    Export Programme Attainment report as CSV
 * @access  Admin, Coordinator, Faculty
 */
router.get(
  '/export-csv/:programmeId',
  authorize('admin', 'coordinator', 'faculty'),
  (req, res, next) => programmeAttainmentController.exportCSV(req, res, next)
);

/**
 * @route   GET /api/programme-attainment/:programmeId
 * @desc    Calculate PO and PSO attainment for a programme
 * @access  Admin, Coordinator, Faculty
 */
router.get(
  '/:programmeId',
  authorize('admin', 'coordinator', 'faculty'),
  (req, res, next) => programmeAttainmentController.getProgrammeAttainment(req, res, next)
);

module.exports = router;
