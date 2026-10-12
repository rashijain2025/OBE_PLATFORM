const attainmentService = require('../services/attainmentService');

class AttainmentController {
  async getCourseAttainment(req, res, next) {
    try {
      const { courseId, target } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const data = await attainmentService.calculateCourseCOAttainment(courseId, target, req.user);
      res.json({ success: true, data, message: 'CO attainment calculated successfully' });
    } catch (err) { next(err); }
  }

  async getReport(req, res, next) {
    try {
      const { courseId, target } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const data = await attainmentService.calculateCourseCOAttainment(courseId, target, req.user);
      res.json({ success: true, data, message: 'Faculty course report generated successfully' });
    } catch (err) { next(err); }
  }

  async exportCSV(req, res, next) {
    try {
      const { courseId, target } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const csv = await attainmentService.generateAttainmentCSV(courseId, target, req.user);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="CO_Attainment_Report_${courseId}.csv"`);
      res.send(csv);
    } catch (err) { next(err); }
  }
}

module.exports = new AttainmentController();
