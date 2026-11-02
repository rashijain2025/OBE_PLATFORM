const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const coordinatorController = require('../controllers/coordinatorController');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/coordinators
 * @access  Admin only
 */
router.get('/', (req, res, next) => coordinatorController.list(req, res, next));

/**
 * @route   POST /api/coordinators
 * @access  Admin only
 */
router.post('/', (req, res, next) => coordinatorController.create(req, res, next));

/**
 * @route   PUT /api/coordinators/:id
 * @access  Admin only
 */
router.put('/:id', (req, res, next) => coordinatorController.update(req, res, next));

/**
 * @route   DELETE /api/coordinators/:id
 * @access  Admin only
 */
router.delete('/:id', (req, res, next) => coordinatorController.remove(req, res, next));

module.exports = router;
