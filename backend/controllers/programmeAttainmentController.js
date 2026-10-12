const programmeAttainmentService = require('../services/programmeAttainmentService');

class ProgrammeAttainmentController {
  async getProgrammeAttainment(req, res, next) {
    try {
      const { programmeId } = req.params;
      const { target, academicYear } = req.query;
      const data = await programmeAttainmentService.calculateProgrammeAttainment(
        programmeId,
        { target, academicYear },
        req.user
      );
      return res.status(200).json({ success: true, data, message: 'Programme attainment calculated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getCoursePOAttainment(req, res, next) {
    try {
      const { courseId } = req.params;
      const { target } = req.query;
      const data = await programmeAttainmentService.calculateCoursePOAttainment(courseId, target, req.user);
      return res.status(200).json({ success: true, data, message: 'Course PO attainment calculated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async exportCSV(req, res, next) {
    try {
      const { programmeId } = req.params;
      const { target, academicYear } = req.query;
      const csv = await programmeAttainmentService.generateProgrammeCSV(
        programmeId,
        { target, academicYear },
        req.user
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="programme_attainment_${programmeId}_${Date.now()}.csv"`
      );
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProgrammeAttainmentController();
