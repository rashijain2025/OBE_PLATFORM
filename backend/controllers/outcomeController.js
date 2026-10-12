const outcomeService = require('../services/outcomeService');

class OutcomeController {
  async list(req, res, next) {
    try {
      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const cos = await outcomeService.listCOs(courseId, req.user);
      res.json({ success: true, data: cos, message: 'Course outcomes retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const co = await outcomeService.getCOById(req.params.id, req.user);
      res.json({ success: true, data: co, message: 'Course outcome retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const co = await outcomeService.createCO(req.body, req.user);
      res.status(201).json({ success: true, data: co, message: 'Course outcome created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const co = await outcomeService.updateCO(req.params.id, req.body, req.user);
      res.json({ success: true, data: co, message: 'Course outcome updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await outcomeService.deleteCO(req.params.id, req.user);
      res.json({ success: true, data: result, message: 'Course outcome deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new OutcomeController();
