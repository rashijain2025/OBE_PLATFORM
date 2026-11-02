const { Course, User, CourseOutcome, Assessment, Question, CourseEnrollment } = require('../models');

/**
 * Service for Course CRUD
 */
class CourseService {
  /**
   * List courses — admin/coordinator see all, faculty see only their own
   */
  async listCourses({ role, userId, programme, academicYear, semester } = {}) {
    const filter = {};
    if (role === 'faculty') filter.faculty = userId;
    if (programme) filter.programme = programme;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = Number(semester);

    return Course.find(filter)
      .populate('faculty', 'name email')
      .populate('programme', 'name code')
      .sort({ academicYear: -1, semester: 1, name: 1 });
  }

  async getCourseById(id, { role, userId } = {}) {
    const course = await Course.findById(id)
      .populate('faculty', 'name email')
      .populate('programme', 'name code');

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    // Faculty can only view their own courses
    if (role === 'faculty' && String(course.faculty._id) !== String(userId)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }

    return course;
  }

  /**
   * Complete Course Details with COs, Assessments (and questions summary), and enrollments
   */
  async getCourseDetails(id, { role, userId } = {}) {
    const course = await this.getCourseById(id, { role, userId });

    const [cos, assessmentsRaw, enrollmentsCount] = await Promise.all([
      CourseOutcome.find({ course: id }).sort({ code: 1 }),
      Assessment.find({ course: id }).sort({ date: 1, createdAt: 1 }),
      CourseEnrollment.countDocuments({ course: id, status: 'active' }),
    ]);

    const assessments = await Promise.all(
      assessmentsRaw.map(async (ass) => {
        const questions = await Question.find({ assessment: ass._id })
          .populate('co', 'code statement bloomLevel')
          .sort({ label: 1 });
        const questionCount = questions.length;
        const questionMarksSum = questions.reduce((sum, q) => sum + q.maxMarks, 0);
        const warning =
          questionCount > 0 && questionMarksSum !== ass.maxMarks
            ? `Question marks sum (${questionMarksSum}) does not match assessment max marks (${ass.maxMarks})`
            : null;

        return {
          ...ass.toObject(),
          questions,
          questionCount,
          questionMarksSum,
          warning,
        };
      })
    );

    return {
      course,
      cos,
      assessments,
      enrollmentsCount,
    };
  }

  async createCourse({ code, name, semester, programme, faculty, academicYear, credits }, { role, user } = {}) {
    if (role === 'coordinator' && user) {
      let userProgId = user.programme?._id || user.programme;
      if (!userProgId) {
        const Programme = require('../models/Programme');
        const prog = await Programme.findOne({ coordinator: user._id });
        if (prog) userProgId = prog._id;
      }
      if (userProgId && String(programme) !== String(userProgId)) {
        const err = new Error('Forbidden: You can only create courses belonging to your programme');
        err.statusCode = 403;
        throw err;
      }
    }

    // Verify faculty exists and has the right role
    const facultyUser = await User.findById(faculty);
    if (!facultyUser || facultyUser.role !== 'faculty') {
      const err = new Error('Invalid faculty: user not found or not a faculty member');
      err.statusCode = 400;
      throw err;
    }

    const course = await Course.create({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      semester,
      programme,
      faculty,
      academicYear: academicYear.trim(),
      credits: credits || 3,
    });

    return Course.findById(course._id)
      .populate('faculty', 'name email')
      .populate('programme', 'name code');
  }

  async updateCourse(id, { code, name, semester, programme, faculty, academicYear, credits }, { role, user } = {}) {
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    if (role === 'coordinator' && user) {
      let userProgId = user.programme?._id || user.programme;
      if (!userProgId) {
        const Programme = require('../models/Programme');
        const prog = await Programme.findOne({ coordinator: user._id });
        if (prog) userProgId = prog._id;
      }
      if (userProgId && String(existingCourse.programme) !== String(userProgId)) {
        const err = new Error('Forbidden: You can only modify courses belonging to your programme');
        err.statusCode = 403;
        throw err;
      }
      if (programme && userProgId && String(programme) !== String(userProgId)) {
        const err = new Error('Forbidden: Cannot reassign course to a different programme');
        err.statusCode = 403;
        throw err;
      }
    }

    if (faculty) {
      const facultyUser = await User.findById(faculty);
      if (!facultyUser || facultyUser.role !== 'faculty') {
        const err = new Error('Invalid faculty: user not found or not a faculty member');
        err.statusCode = 400;
        throw err;
      }
    }

    const update = {};
    if (code !== undefined) update.code = code.toUpperCase().trim();
    if (name !== undefined) update.name = name.trim();
    if (semester !== undefined) update.semester = semester;
    if (programme !== undefined) update.programme = programme;
    if (faculty !== undefined) update.faculty = faculty;
    if (academicYear !== undefined) update.academicYear = academicYear.trim();
    if (credits !== undefined) update.credits = credits;

    const course = await Course.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('faculty', 'name email')
      .populate('programme', 'name code');

    return course;
  }

  async deleteCourse(id) {
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true, id };
  }
}

module.exports = new CourseService();
