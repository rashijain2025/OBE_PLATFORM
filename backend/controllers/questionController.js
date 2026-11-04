const questionService = require('../services/questionService');

class QuestionController {
  async savePaper(req, res, next) {
    try {
      const { assessmentId, questions, allowDeleteWithMarks } = req.body;
      if (!assessmentId) {
        return res.status(400).json({ success: false, data: null, message: 'assessmentId is required' });
      }
      const result = await questionService.savePaper(
        { assessmentId, questions, allowDeleteWithMarks: Boolean(allowDeleteWithMarks) },
        req.user
      );
      res.json({ success: true, data: result, message: 'Question paper saved' });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const { assessmentId } = req.query;
      if (!assessmentId) {
        return res.status(400).json({ success: false, data: null, message: 'assessmentId query param is required' });
      }
      const result = await questionService.listQuestions(assessmentId, req.user);
      res.json({
        success: true,
        data: result.questions,
        totalMarks: result.totalMarks,
        maxMarks: result.maxMarks,
        warning: result.warning,
        message: 'Questions retrieved successfully',
      });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const question = await questionService.getQuestionById(req.params.id, req.user);
      res.json({ success: true, data: question, message: 'Question retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const result = await questionService.createQuestion(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result.question,
        totalMarks: result.totalMarks,
        maxMarks: result.maxMarks,
        warning: result.warning,
        message: 'Question created successfully',
      });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const result = await questionService.updateQuestion(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: result.question,
        totalMarks: result.totalMarks,
        maxMarks: result.maxMarks,
        warning: result.warning,
        message: 'Question updated successfully',
      });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await questionService.deleteQuestion(req.params.id, req.user);
      res.json({
        success: true,
        data: { deleted: result.deleted, id: result.id },
        totalMarks: result.totalMarks,
        maxMarks: result.maxMarks,
        warning: result.warning,
        message: 'Question deleted successfully',
      });
    } catch (err) { next(err); }
  }
}

module.exports = new QuestionController();
