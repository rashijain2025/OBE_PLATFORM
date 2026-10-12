const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const programmeController = require('../controllers/programmeController');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/programmes
 * @access  Authenticated
 */
router.get('/', (req, res, next) => programmeController.list(req, res, next));

/**
 * @route   GET /api/programmes/:id
 * @access  Authenticated
 */
router.get('/:id', (req, res, next) => programmeController.getOne(req, res, next));

/**
 * @route   POST /api/programmes
 * @access  Admin
 */
router.post('/', authorize('admin'), (req, res, next) => programmeController.create(req, res, next));

/**
 * @route   PUT /api/programmes/:id
 * @access  Admin
 */
router.put('/:id', authorize('admin'), (req, res, next) => programmeController.update(req, res, next));

/**
 * @route   DELETE /api/programmes/:id
 * @access  Admin
 */
router.delete('/:id', authorize('admin'), (req, res, next) => programmeController.remove(req, res, next));

module.exports = router;
