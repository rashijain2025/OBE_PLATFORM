const markService = require('../services/markService');

class MarkController {
  async getGrid(req, res, next) {
    try {
      const { assessmentId } = req.query;
      if (!assessmentId) {
        return res.status(400).json({ success: false, data: null, message: 'assessmentId query param is required' });
      }
      const grid = await markService.getMarksGrid(assessmentId, req.user);
      res.json({ success: true, data: grid, message: 'Marks grid retrieved successfully' });
    } catch (err) { next(err); }
  }

  async saveBulk(req, res, next) {
    try {
      const { assessmentId, marks } = req.body;
      const result = await markService.saveBulkMarks({ assessmentId, marks }, req.user);
      res.json({ success: true, data: result, message: 'Marks saved successfully' });
    } catch (err) { next(err); }
  }

  async importCSV(req, res, next) {
    try {
      const { assessmentId, csvText, rows } = req.body;
      const result = await markService.importCSV({ assessmentId, csvText, rows }, req.user);
      res.json({ success: true, data: result, message: 'CSV import processed' });
    } catch (err) { next(err); }
  }
}

module.exports = new MarkController();
