const { Assessment, Course, Question } = require('../models');

class AssessmentService {
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
   * List assessments for a course with questions summary
   */
  async listAssessments(courseId, user) {
    await this.verifyCourseAccess(courseId, user);

    const assessments = await Assessment.find({ course: courseId }).sort({ date: 1, createdAt: 1 });

    // Attach questions summary (count, totalMarks, warning)
    const results = await Promise.all(
      assessments.map(async (ass) => {
        const questions = await Question.find({ assessment: ass._id });
        const questionCount = questions.length;
        const questionMarksSum = questions.reduce((sum, q) => sum + q.maxMarks, 0);
        const warning =
          questionCount > 0 && questionMarksSum !== ass.maxMarks
            ? `Question marks sum (${questionMarksSum}) does not match assessment max marks (${ass.maxMarks})`
            : null;

        return {
          ...ass.toObject(),
          questionCount,
          questionMarksSum,
          warning,
        };
      })
    );

    return results;
  }

  /**
   * Get single assessment with questions populated
   */
  async getAssessmentById(id, user) {
    const assessment = await Assessment.findById(id).populate('course', 'name code faculty');
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'faculty' && String(assessment.course.faculty) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }

    const questions = await Question.find({ assessment: id })
      .populate('cos', 'code statement bloomLevel')
      .populate('co', 'code statement bloomLevel')
      .sort({ label: 1 });
    const questionMarksSum = questions.reduce((sum, q) => sum + q.maxMarks, 0);
    const warning =
      questions.length > 0 && questionMarksSum !== assessment.maxMarks
        ? `Question marks sum (${questionMarksSum}) does not match assessment max marks (${assessment.maxMarks})`
        : null;

    return {
      ...assessment.toObject(),
      questions,
      questionMarksSum,
      warning,
    };
  }

  /**
   * Create an assessment
   */
  async createAssessment(data, user) {
    const { courseId, name, type, maxMarks, weightage, date } = data;
    if (!courseId || !name || maxMarks === undefined) {
      const err = new Error('courseId, name, and maxMarks are required');
      err.statusCode = 400;
      throw err;
    }

    await this.verifyCourseAccess(courseId, user);

    const existing = await Assessment.findOne({ course: courseId, name: name.trim() });
    if (existing) {
      const err = new Error(`Assessment "${name.trim()}" already exists for this course`);
      err.statusCode = 400;
      throw err;
    }

    const assessment = await Assessment.create({
      course: courseId,
      name: name.trim(),
      type: type || 'internal',
      maxMarks: Number(maxMarks),
      weightage: weightage !== undefined ? Number(weightage) : 1.0,
      date: date ? new Date(date) : new Date(),
    });

    return {
      ...assessment.toObject(),
      questionCount: 0,
      questionMarksSum: 0,
      warning: null,
    };
  }

  /**
   * Update an assessment
   */
  async updateAssessment(id, data, user) {
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course, user);

    if (data.name && data.name.trim() !== assessment.name) {
      const existing = await Assessment.findOne({ course: assessment.course, name: data.name.trim() });
      if (existing) {
        const err = new Error(`Assessment "${data.name.trim()}" already exists for this course`);
        err.statusCode = 400;
        throw err;
      }
      assessment.name = data.name.trim();
    }

    if (data.type !== undefined) assessment.type = data.type;
    if (data.maxMarks !== undefined) assessment.maxMarks = Number(data.maxMarks);
    if (data.weightage !== undefined) assessment.weightage = Number(data.weightage);
    if (data.date !== undefined) assessment.date = new Date(data.date);

    await assessment.save();

    // Check questions marks sum vs updated maxMarks
    const questions = await Question.find({ assessment: id });
    const questionMarksSum = questions.reduce((sum, q) => sum + q.maxMarks, 0);
    const warning =
      questions.length > 0 && questionMarksSum !== assessment.maxMarks
        ? `Question marks sum (${questionMarksSum}) does not match assessment max marks (${assessment.maxMarks})`
        : null;

    return {
      ...assessment.toObject(),
      questionCount: questions.length,
      questionMarksSum,
      warning,
    };
  }

  /**
   * Delete an assessment and cascade questions
   */
  async deleteAssessment(id, user) {
    const assessment = await Assessment.findById(id);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course, user);

    await Question.deleteMany({ assessment: id });
    await Assessment.findByIdAndDelete(id);

    return { deleted: true, id };
  }
}

module.exports = new AssessmentService();
