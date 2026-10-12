const mappingService = require('../services/mappingService');

class MappingController {
  async getMatrix(req, res, next) {
    try {
      const { courseId } = req.params;
      const data = await mappingService.getCourseMappingMatrix(courseId, req.user);
      return res.status(200).json({ success: true, data, message: 'Mapping matrix retrieved successfully' });
    } catch (err) {
      next(err);
    }
  }

  async saveMatrix(req, res, next) {
    try {
      const { courseId } = req.params;
      const data = await mappingService.saveCourseMappingMatrix(courseId, req.body, req.user);
      return res.status(200).json({ success: true, data, message: 'Mapping matrix saved successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MappingController();
