const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const invitationController = require('../controllers/invitationController');

const router = express.Router();

router.use(protect);
router.use(authorize('coordinator'));

/**
 * @route   GET /api/invitations
 * @access  Coordinator only (scoped to own department)
 */
router.get('/', (req, res, next) => invitationController.list(req, res, next));

/**
 * @route   POST /api/invitations
 * @access  Coordinator only (scoped to own department)
 */
router.post('/', (req, res, next) => invitationController.invite(req, res, next));

/**
 * @route   POST /api/invitations/:id/resend
 * @access  Coordinator only
 */
router.post('/:id/resend', (req, res, next) => invitationController.resend(req, res, next));

/**
 * @route   DELETE /api/invitations/:id
 * @access  Coordinator only
 */
router.delete('/:id', (req, res, next) => invitationController.revoke(req, res, next));

module.exports = router;
