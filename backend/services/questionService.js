const { Question, Assessment, CourseOutcome, Course } = require('../models');

class QuestionService {
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
   * Helper to check question marks sum against assessment maxMarks
   */
  async checkMarksMismatch(assessmentId) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return { totalMarks: 0, maxMarks: 0, warning: null };

    const questions = await Question.find({ assessment: assessmentId });
    const totalMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0);

    let warning = null;
    if (totalMarks !== assessment.maxMarks) {
      warning = `Question marks sum (${totalMarks}) does not match assessment max marks (${assessment.maxMarks})`;
    }

    return { totalMarks, maxMarks: assessment.maxMarks, warning };
  }

  /**
   * List questions for an assessment
   */
  async listQuestions(assessmentId, user) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course, user);

    const questions = await Question.find({ assessment: assessmentId })
      .populate('co', 'code statement bloomLevel targetMarksPercentage')
      .sort({ label: 1 });

    const mismatch = await this.checkMarksMismatch(assessmentId);

    return {
      questions,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
    };
  }

  /**
   * Get single question
   */
  async getQuestionById(id, user) {
    const question = await Question.findById(id)
      .populate('co', 'code statement bloomLevel')
      .populate('assessment', 'name maxMarks');

    if (!question) {
      const err = new Error('Question not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(question.course, user);
    return question;
  }

  /**
   * Create question with Question→CO mapping and validations
   */
  async createQuestion(data, user) {
    const { assessmentId, label, maxMarks, coId } = data;
    if (!assessmentId || !label || maxMarks === undefined || !coId) {
      const err = new Error('assessmentId, label, maxMarks, and coId are required');
      err.statusCode = 400;
      throw err;
    }

    // 1. Verify assessment exists
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Verify faculty owns the course
    await this.verifyCourseAccess(assessment.course, user);

    // 3. Verify CO exists
    const co = await CourseOutcome.findById(coId);
    if (!co) {
      const err = new Error('Course Outcome not found');
      err.statusCode = 404;
      throw err;
    }

    // 4. Validate CO belongs to the EXACT same course (cross-course mapping prevention)
    if (String(co.course) !== String(assessment.course)) {
      const err = new Error('Cross-course mapping rejected: Course Outcome does not belong to this course');
      err.statusCode = 400;
      throw err;
    }

    // 5. Unique label in this assessment
    const formattedLabel = label.trim();
    const existing = await Question.findOne({ assessment: assessmentId, label: formattedLabel });
    if (existing) {
      const err = new Error(`Question "${formattedLabel}" already exists in this assessment`);
      err.statusCode = 400;
      throw err;
    }

    // 6. Create question
    const question = await Question.create({
      assessment: assessmentId,
      course: assessment.course,
      label: formattedLabel,
      maxMarks: Number(maxMarks),
      co: coId,
    });

    const populated = await Question.findById(question._id).populate('co', 'code statement bloomLevel');

    // 7. Check marks mismatch (warn, don't silently change)
    const mismatch = await this.checkMarksMismatch(assessmentId);

    return {
      question: populated,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
    };
  }

  /**
   * Update question
   */
  async updateQuestion(id, data, user) {
    const question = await Question.findById(id);
    if (!question) {
      const err = new Error('Question not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(question.course, user);

    if (data.coId && String(data.coId) !== String(question.co)) {
      const co = await CourseOutcome.findById(data.coId);
      if (!co) {
        const err = new Error('Course Outcome not found');
        err.statusCode = 404;
        throw err;
      }
      if (String(co.course) !== String(question.course)) {
        const err = new Error('Cross-course mapping rejected: Course Outcome does not belong to this course');
        err.statusCode = 400;
        throw err;
      }
      question.co = data.coId;
    }

    if (data.label && data.label.trim() !== question.label) {
      const formattedLabel = data.label.trim();
      const existing = await Question.findOne({
        assessment: question.assessment,
        label: formattedLabel,
        _id: { $ne: id },
      });
      if (existing) {
        const err = new Error(`Question "${formattedLabel}" already exists in this assessment`);
        err.statusCode = 400;
        throw err;
      }
      question.label = formattedLabel;
    }

    if (data.maxMarks !== undefined) {
      question.maxMarks = Number(data.maxMarks);
    }

    await question.save();

    const populated = await Question.findById(question._id).populate('co', 'code statement bloomLevel');
    const mismatch = await this.checkMarksMismatch(question.assessment);

    return {
      question: populated,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
    };
  }

  /**
   * Delete question
   */
  async deleteQuestion(id, user) {
    const question = await Question.findById(id);
    if (!question) {
      const err = new Error('Question not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(question.course, user);
    const assessmentId = question.assessment;

    await Question.findByIdAndDelete(id);

    const mismatch = await this.checkMarksMismatch(assessmentId);

    return {
      deleted: true,
      id,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
    };
  }
}

module.exports = new QuestionService();
