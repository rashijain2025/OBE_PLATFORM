const { Question, Assessment, CourseOutcome, Course, StudentMarks } = require('../models');

// Populate every mapped CO (and the first one, for older screens that read `co`)
const CO_POPULATE = [
  { path: 'cos', select: 'code statement bloomLevel targetMarksPercentage' },
  { path: 'co', select: 'code statement bloomLevel' },
];

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
      .populate(CO_POPULATE)
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
      .populate(CO_POPULATE)
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
  /**
   * CO ids from a request: `coIds` (list) or the older single `coId`, without duplicates
   */
  requestedCoIds(data) {
    const list = Array.isArray(data.coIds) ? data.coIds : data.coId ? [data.coId] : [];
    return [...new Set(list.filter(Boolean).map(String))];
  }

  /**
   * Every CO must exist and belong to the same course (cross-course mapping prevention)
   */
  async assertCOsBelongToCourse(coIds, courseId) {
    const cos = await CourseOutcome.find({ _id: { $in: coIds } }).select('course');
    if (cos.length !== coIds.length) {
      const err = new Error('Course Outcome not found');
      err.statusCode = 404;
      throw err;
    }
    if (cos.some((co) => String(co.course) !== String(courseId))) {
      const err = new Error('Cross-course mapping rejected: Course Outcome does not belong to this course');
      err.statusCode = 400;
      throw err;
    }
  }

  async createQuestion(data, user) {
    const { assessmentId, label, maxMarks } = data;
    const coIds = this.requestedCoIds(data);
    if (!assessmentId || !label || maxMarks === undefined || coIds.length === 0) {
      const err = new Error('assessmentId, label, maxMarks, and at least one CO are required');
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

    // 3–4. Every mapped CO exists and belongs to this course
    await this.assertCOsBelongToCourse(coIds, assessment.course);

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
      cos: coIds,
    });

    const populated = await Question.findById(question._id).populate(CO_POPULATE);

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

    const coIds = this.requestedCoIds(data);
    if (coIds.length > 0) {
      await this.assertCOsBelongToCourse(coIds, question.course);
      question.cos = coIds;
      question.co = coIds[0];
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

    const populated = await Question.findById(question._id).populate(CO_POPULATE);
    const mismatch = await this.checkMarksMismatch(question.assessment);

    return {
      question: populated,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
    };
  }

  /**
   * Save a whole question paper at once: rows with _id are updated, rows without are created,
   * and existing questions missing from the list are deleted (with their marks, only if confirmed).
   * rows: [{ _id?, label, maxMarks, coIds: [..] }] (a single coId is also accepted)
   */
  async savePaper({ assessmentId, questions: rows, allowDeleteWithMarks }, user) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyCourseAccess(assessment.course, user);

    if (!Array.isArray(rows)) {
      const err = new Error('questions array is required');
      err.statusCode = 400;
      throw err;
    }

    const courseCoIds = new Set((await CourseOutcome.find({ course: assessment.course }).distinct('_id')).map(String));
    const existing = await Question.find({ assessment: assessmentId });
    const existingById = new Map(existing.map((q) => [String(q._id), q]));

    // 1. Validate every row before touching anything
    const errors = [];
    const seenLabels = new Set();
    rows.forEach((row, i) => {
      const label = String(row.label || '').trim();
      const marks = Number(row.maxMarks);
      const rowName = label || `Row ${i + 1}`;
      if (!label) errors.push(`Row ${i + 1}: label is required`);
      else if (seenLabels.has(label.toUpperCase())) errors.push(`${rowName}: label is used twice`);
      seenLabels.add(label.toUpperCase());
      if (!Number.isFinite(marks) || marks <= 0) errors.push(`${rowName}: marks must be more than 0`);
      const rowCoIds = this.requestedCoIds(row);
      if (rowCoIds.length === 0) errors.push(`${rowName}: tick at least one CO`);
      else if (rowCoIds.some((id) => !courseCoIds.has(id))) errors.push(`${rowName}: choose COs of this course`);
      if (row._id && !existingById.has(String(row._id))) errors.push(`${rowName}: question no longer exists, reload the page`);
    });
    if (errors.length > 0) {
      const err = new Error(errors.join('; '));
      err.statusCode = 400;
      throw err;
    }

    // 2. Questions being removed that already have marks need explicit confirmation
    const keptIds = new Set(rows.filter((r) => r._id).map((r) => String(r._id)));
    const removed = existing.filter((q) => !keptIds.has(String(q._id)));
    const removedWithMarks = [];
    for (const q of removed) {
      if (await StudentMarks.exists({ question: q._id })) removedWithMarks.push(q.label);
    }
    if (removedWithMarks.length > 0 && !allowDeleteWithMarks) {
      const err = new Error(
        `Marks have already been entered for ${removedWithMarks.join(', ')}. Removing them will delete those marks.`
      );
      err.statusCode = 409;
      err.data = { removedWithMarks };
      throw err;
    }

    // 3. Apply: delete removed (and their marks), then update/create in order
    if (removed.length > 0) {
      const removedIds = removed.map((q) => q._id);
      await StudentMarks.deleteMany({ question: { $in: removedIds } });
      await Question.deleteMany({ _id: { $in: removedIds } });
    }

    // Temporarily free labels of kept questions so swapped labels (Q1 <-> Q2) don't hit the unique index
    const kept = rows.filter((r) => r._id);
    for (const row of kept) {
      await Question.updateOne({ _id: row._id }, { label: `__tmp_${row._id}` });
    }
    for (const row of rows) {
      const coIds = this.requestedCoIds(row);
      const fields = { label: String(row.label).trim(), maxMarks: Number(row.maxMarks), cos: coIds, co: coIds[0] };
      if (row._id) {
        await Question.updateOne({ _id: row._id }, fields);
      } else {
        await Question.create({ ...fields, assessment: assessmentId, course: assessment.course });
      }
    }

    const saved = await Question.find({ assessment: assessmentId })
      .populate(CO_POPULATE)
      .sort({ label: 1 });
    const mismatch = await this.checkMarksMismatch(assessmentId);

    return {
      questions: saved,
      totalMarks: mismatch.totalMarks,
      maxMarks: mismatch.maxMarks,
      warning: mismatch.warning,
      deletedWithMarks: removedWithMarks,
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
