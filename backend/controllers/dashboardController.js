const dashboardService = require('../services/dashboardService');

class DashboardController {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats(req.user);
      res.json({ success: true, data: stats, message: 'Dashboard stats retrieved successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new DashboardController();
