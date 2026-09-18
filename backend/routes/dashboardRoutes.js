const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getFacultyDashboard } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/faculty — Protected
router.get('/faculty', protect, getFacultyDashboard);

module.exports = router;
