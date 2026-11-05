const { CourseOutcome, Course, Question } = require('../models');
const departmentService = require('./departmentService');

// A course has at most 5 Course Outcomes: CO1 to CO5
const ALLOWED_CO_CODES = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

function assertAllowedCode(code) {
  if (!ALLOWED_CO_CODES.includes(code)) {
    const err = new Error('A course can have at most 5 Course Outcomes: use CO1 to CO5');
    err.statusCode = 400;
    throw err;
  }
}

class OutcomeService {
  /**
   * Helper: verify faculty owns the course
   */
  async verifyCourseAccess(courseId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role === 'faculty' && String(course.faculty) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }
    return course;
  }

  /**
   * List COs for a course
   */
  async listCOs(courseId, user) {
    await this.verifyCourseAccess(courseId, user);
    return CourseOutcome.find({ course: courseId }).sort({ code: 1 });
  }

  /**
   * Get single CO
   */
  async getCOById(id, user) {
    const co = await CourseOutcome.findById(id).populate('course', 'name code faculty');
    if (!co) {
      const err = new Error('Course Outcome not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role === 'faculty' && String(co.course.faculty) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }
    return co;
  }

  /**
   * Create a CO for a course
   */
  async createCO(data, user) {
    const { courseId, code, statement, targetMarksPercentage, targetAttainmentPercentage, bloomLevel } = data;
    if (!courseId || !code || !statement) {
      const err = new Error('courseId, code, and statement are required');
      err.statusCode = 400;
      throw err;
    }

    await this.verifyCourseAccess(courseId, user);

    const formattedCode = code.toUpperCase().trim();
    assertAllowedCode(formattedCode);
    const existing = await CourseOutcome.findOne({ course: courseId, code: formattedCode });
    if (existing) {
      const err = new Error(`Course Outcome ${formattedCode} already exists for this course`);
      err.statusCode = 400;
      throw err;
    }

    // Targets not supplied come from the department the coordinator configured
    const departmentTargets = await departmentService.getTargetsForCourse(courseId);

    const co = await CourseOutcome.create({
      course: courseId,
      code: formattedCode,
      statement: statement.trim(),
      targetMarksPercentage:
        targetMarksPercentage !== undefined ? Number(targetMarksPercentage) : departmentTargets.targetMarksPercentage,
      targetAttainmentPercentage:
        targetAttainmentPercentage !== undefined
          ? Number(targetAttainmentPercentage)
          : departmentTargets.targetAttainmentPercentage,
      bloomLevel: bloomLevel || 'L3: Apply',
    });

    return co;
  }

  /**
   * Update a CO
   */
  async updateCO(id, data, user) {
    const co = await CourseOutcome.findById(id);
    if (!co) {
      const err = new Error('Course Outcome not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(co.course, user);

    if (data.code && data.code.toUpperCase().trim() !== co.code) {
      const formattedCode = data.code.toUpperCase().trim();
      assertAllowedCode(formattedCode);
      const existing = await CourseOutcome.findOne({ course: co.course, code: formattedCode });
      if (existing) {
        const err = new Error(`Course Outcome ${formattedCode} already exists for this course`);
        err.statusCode = 400;
        throw err;
      }
      co.code = formattedCode;
    }

    if (data.statement !== undefined) co.statement = data.statement.trim();
    if (data.targetMarksPercentage !== undefined) co.targetMarksPercentage = Number(data.targetMarksPercentage);
    if (data.targetAttainmentPercentage !== undefined) co.targetAttainmentPercentage = Number(data.targetAttainmentPercentage);
    if (data.bloomLevel !== undefined) co.bloomLevel = data.bloomLevel;

    await co.save();
    return co;
  }

  /**
   * Delete a CO (blocked if mapped questions exist)
   */
  async deleteCO(id, user) {
    const co = await CourseOutcome.findById(id);
    if (!co) {
      const err = new Error('Course Outcome not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(co.course, user);

    const mappedQuestionsCount = await Question.countDocuments({ $or: [{ co: id }, { cos: id }] });
    if (mappedQuestionsCount > 0) {
      const err = new Error(`Cannot delete Course Outcome: ${mappedQuestionsCount} question(s) are mapped to it`);
      err.statusCode = 400;
      throw err;
    }

    await CourseOutcome.findByIdAndDelete(id);
    return { deleted: true, id };
  }
}

module.exports = new OutcomeService();
