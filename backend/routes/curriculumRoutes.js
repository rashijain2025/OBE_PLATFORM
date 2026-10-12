const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const curriculumController = require('../controllers/curriculumController');

const router = express.Router();

router.use(protect);

// Read all curriculum outcomes (PEOs, POs, PSOs)
router.get('/', (req, res, next) => curriculumController.getCurriculum(req, res, next));

// PEO CRUD (admin and coordinator only)
router.post('/peos', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.createPEO(req, res, next));
router.put('/peos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.updatePEO(req, res, next));
router.delete('/peos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.deletePEO(req, res, next));

// PO CRUD (admin and coordinator only)
router.post('/pos', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.createPO(req, res, next));
router.put('/pos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.updatePO(req, res, next));
router.delete('/pos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.deletePO(req, res, next));

// PSO CRUD (admin and coordinator only)
router.post('/psos', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.createPSO(req, res, next));
router.put('/psos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.updatePSO(req, res, next));
router.delete('/psos/:id', authorize('admin', 'coordinator'), (req, res, next) => curriculumController.deletePSO(req, res, next));

module.exports = router;
