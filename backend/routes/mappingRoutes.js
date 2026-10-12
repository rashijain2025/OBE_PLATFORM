const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const mappingController = require('../controllers/mappingController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/mappings/matrix/:courseId
 * @desc    Get CO-PO and CO-PSO mapping matrix for a course
 * @access  Admin, Coordinator, Faculty
 */
router.get('/matrix/:courseId', authorize('admin', 'coordinator', 'faculty'), (req, res, next) =>
  mappingController.getMatrix(req, res, next)
);

/**
 * @route   POST /api/mappings/matrix/:courseId
 * @desc    Save/update CO-PO and CO-PSO mappings with strength 1/2/3
 * @access  Admin, Coordinator
 */
router.post('/matrix/:courseId', authorize('admin', 'coordinator'), (req, res, next) =>
  mappingController.saveMatrix(req, res, next)
);

module.exports = router;
