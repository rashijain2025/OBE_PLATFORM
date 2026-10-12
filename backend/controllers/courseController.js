const courseService = require('../services/courseService');

class CourseController {
  async list(req, res, next) {
    try {
      const { programme, academicYear, semester } = req.query;
      const courses = await courseService.listCourses({
        role: req.user.role,
        userId: req.user._id,
        programme,
        academicYear,
        semester,
      });
      res.json({ success: true, data: courses, message: 'Courses retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const course = await courseService.getCourseById(req.params.id, {
        role: req.user.role,
        userId: req.user._id,
      });
      res.json({ success: true, data: course, message: 'Course retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getDetails(req, res, next) {
    try {
      const details = await courseService.getCourseDetails(req.params.id, {
        role: req.user.role,
        userId: req.user._id,
      });
      res.json({ success: true, data: details, message: 'Course details retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { code, name, semester, programme, faculty, academicYear, credits } = req.body;
      if (!code || !name || !semester || !programme || !faculty || !academicYear) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'code, name, semester, programme, faculty and academicYear are required',
        });
      }
      const course = await courseService.createCourse({ code, name, semester, programme, faculty, academicYear, credits });
      res.status(201).json({ success: true, data: course, message: 'Course created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { code, name, semester, programme, faculty, academicYear, credits } = req.body;
      const course = await courseService.updateCourse(req.params.id, { code, name, semester, programme, faculty, academicYear, credits });
      res.json({ success: true, data: course, message: 'Course updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await courseService.deleteCourse(req.params.id);
      res.json({ success: true, data: result, message: 'Course deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new CourseController();
