const assessmentService = require('../services/assessmentService');

class AssessmentController {
  async list(req, res, next) {
    try {
      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const assessments = await assessmentService.listAssessments(courseId, req.user);
      res.json({ success: true, data: assessments, message: 'Assessments retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const assessment = await assessmentService.getAssessmentById(req.params.id, req.user);
      res.json({ success: true, data: assessment, message: 'Assessment retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const assessment = await assessmentService.createAssessment(req.body, req.user);
      res.status(201).json({ success: true, data: assessment, message: 'Assessment created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user);
      res.json({ success: true, data: assessment, message: 'Assessment updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await assessmentService.deleteAssessment(req.params.id, req.user);
      res.json({ success: true, data: result, message: 'Assessment deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new AssessmentController();
