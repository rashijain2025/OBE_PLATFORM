const enrollmentService = require('../services/enrollmentService');

class EnrollmentController {
  async enroll(req, res, next) {
    try {
      const { courseId, studentId } = req.body;
      if (!courseId || !studentId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId and studentId are required' });
      }
      const enrollment = await enrollmentService.enrollStudent({ courseId, studentId }, req.user);
      res.status(201).json({ success: true, data: enrollment, message: 'Student enrolled successfully' });
    } catch (err) { next(err); }
  }

  async bulkEnroll(req, res, next) {
    try {
      const { courseId, rollNumbers } = req.body;
      if (!courseId || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
        return res.status(400).json({ success: false, data: null, message: 'courseId and a non-empty rollNumbers array are required' });
      }
      const result = await enrollmentService.bulkEnroll({ courseId, rollNumbers }, req.user);
      res.status(201).json({ success: true, data: result, message: 'Bulk enrollment completed' });
    } catch (err) { next(err); }
  }

  async classGroups(req, res, next) {
    try {
      if (!req.query.courseId) {
        return res.status(400).json({ success: false, data: null, message: 'courseId query param is required' });
      }
      const data = await enrollmentService.listClassGroupsForCourse(req.query.courseId, req.user);
      res.json({ success: true, data, message: 'Class lists retrieved successfully' });
    } catch (err) { next(err); }
  }

  async enrollClass(req, res, next) {
    try {
      const { courseId, batch, section } = req.body;
      if (!courseId || !batch || !section) {
        return res.status(400).json({ success: false, data: null, message: 'courseId, batch and section are required' });
      }
      const data = await enrollmentService.enrollClass({ courseId, batch, section }, req.user);
      res.status(201).json({ success: true, data, message: `Enrolled ${data.enrolled + data.reactivated} student(s)` });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const enrollments = await enrollmentService.listEnrollments({ courseId: req.query.courseId }, req.user);
      res.json({ success: true, data: enrollments, message: 'Enrollments retrieved successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await enrollmentService.removeEnrollment(req.params.id, req.user);
      res.json({ success: true, data: result, message: 'Enrollment removed successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new EnrollmentController();
