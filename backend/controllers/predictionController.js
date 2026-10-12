const predictionService = require('../services/predictionService');

class PredictionController {
  async getCoursePredictions(req, res, next) {
    try {
      const { id } = req.params;
      const { target } = req.query;
      const data = await predictionService.predictCourseAttainment(id, target, req.user);
      return res.status(200).json({
        success: true,
        data,
        message: data.mlServiceOnline
          ? 'Course predictions generated successfully'
          : data.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async getModelInfo(req, res, next) {
    try {
      const data = await predictionService.getModelInfo();
      return res.status(200).json({
        success: true,
        data,
        message: 'Model information retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async trainModel(req, res, next) {
    try {
      const data = await predictionService.trainModel();
      return res.status(200).json({
        success: true,
        data,
        message: 'ML model retrained successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PredictionController();
