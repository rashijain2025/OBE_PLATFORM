const { StudentMarks, Assessment, Question, CourseEnrollment, User, Course } = require('../models');

class MarkService {
  async verifyCourseAccess(courseId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    if (user && user.role === 'faculty' && String(course.faculty) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }
    return course;
  }

  /**
   * Get marks grid for an assessment (students × questions)
   */
  async getMarksGrid(assessmentId, user) {
    const assessment = await Assessment.findById(assessmentId).populate('course', 'name code faculty');
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course._id, user);

    // 1. Fetch questions for this assessment
    const questions = await Question.find({ assessment: assessmentId })
      .populate('co', 'code statement bloomLevel')
      .sort({ label: 1 });

    // 2. Fetch active enrolled students for the course
    const enrollments = await CourseEnrollment.find({ course: assessment.course._id, status: 'active' })
      .populate('student', 'name email rollNo')
      .sort({ createdAt: 1 });

    const students = enrollments.map((e) => e.student).filter(Boolean);

    // 3. Fetch existing marks for this assessment
    const existingMarks = await StudentMarks.find({ assessment: assessmentId });

    // 4. Build 2D lookup: marksMap[studentId][questionId] = marksObtained (number or null)
    const marksMap = {};
    for (const s of students) {
      marksMap[String(s._id)] = {};
      for (const q of questions) {
        marksMap[String(s._id)][String(q._id)] = null; // default not evaluated
      }
    }

    for (const m of existingMarks) {
      const sId = String(m.student);
      const qId = String(m.question);
      if (marksMap[sId] && qId in marksMap[sId]) {
        marksMap[sId][qId] = m.marksObtained;
      }
    }

    return {
      assessment: {
        _id: assessment._id,
        name: assessment.name,
        type: assessment.type,
        maxMarks: assessment.maxMarks,
        course: assessment.course,
      },
      questions,
      students,
      marks: marksMap,
    };
  }

  /**
   * Bulk save marks
   * entries: Array of { studentId, questionId, marksObtained }
   */
  async saveBulkMarks({ assessmentId, marks: marksEntries }, user) {
    if (!assessmentId || !Array.isArray(marksEntries)) {
      const err = new Error('assessmentId and marks array are required');
      err.statusCode = 400;
      throw err;
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course, user);

    // Cache active enrollments
    const enrolledStudents = await CourseEnrollment.find({
      course: assessment.course,
      status: 'active',
    }).distinct('student');
    const enrolledSet = new Set(enrolledStudents.map(String));

    // Cache questions for this assessment
    const questions = await Question.find({ assessment: assessmentId });
    const questionMap = new Map(questions.map((q) => [String(q._id), q]));

    // 1. Validate every entry first before saving any
    const validatedOperations = [];

    for (const entry of marksEntries) {
      const { studentId, questionId, marksObtained } = entry;

      // Validation 1: Student must be enrolled
      if (!enrolledSet.has(String(studentId))) {
        const err = new Error(`Validation error: Student ${studentId} is not enrolled in this course`);
        err.statusCode = 400;
        throw err;
      }

      // Validation 2: Question must belong to assessment/course
      const question = questionMap.get(String(questionId));
      if (!question) {
        const err = new Error(`Validation error: Question ${questionId} does not belong to this assessment`);
        err.statusCode = 400;
        throw err;
      }

      // Validation 3 & 4: 0 <= marks <= maxMarks, empty = not evaluated (null)
      let finalMarks = null;
      if (marksObtained !== null && marksObtained !== undefined && marksObtained !== '') {
        const num = Number(marksObtained);
        if (isNaN(num) || num < 0 || num > question.maxMarks) {
          const err = new Error(
            `Validation error: Marks for question ${question.label} must be between 0 and ${question.maxMarks}`
          );
          err.statusCode = 400;
          throw err;
        }
        finalMarks = num;
      }

      validatedOperations.push({
        updateOne: {
          filter: { student: studentId, question: questionId },
          update: {
            $set: {
              course: assessment.course,
              assessment: assessmentId,
              student: studentId,
              question: questionId,
              marksObtained: finalMarks,
            },
          },
          upsert: true,
        },
      });
    }

    if (validatedOperations.length > 0) {
      await StudentMarks.bulkWrite(validatedOperations);
    }

    return {
      savedCount: validatedOperations.length,
      message: 'Marks saved successfully',
    };
  }

  /**
   * Import marks from CSV
   * Supports either parsed `rows` or raw `csvText`
   */
  async importCSV({ assessmentId, csvText, rows }, user) {
    if (!assessmentId) {
      const err = new Error('assessmentId is required');
      err.statusCode = 400;
      throw err;
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.statusCode = 404;
      throw err;
    }

    await this.verifyCourseAccess(assessment.course, user);

    // Fetch questions for this assessment
    const questions = await Question.find({ assessment: assessmentId });
    if (questions.length === 0) {
      const err = new Error('No questions configured for this assessment');
      err.statusCode = 400;
      throw err;
    }

    // Map question label (normalized uppercase) -> question doc
    const labelToQuestion = new Map();
    for (const q of questions) {
      labelToQuestion.set(q.label.toUpperCase().trim(), q);
    }

    // Fetch active enrolled students
    const enrollments = await CourseEnrollment.find({ course: assessment.course, status: 'active' }).populate('student');
    const rollToStudent = new Map();
    for (const e of enrollments) {
      if (e.student && e.student.rollNo) {
        rollToStudent.set(e.student.rollNo.toUpperCase().trim(), e.student);
      }
    }

    let parsedRows = rows;

    // If raw csvText provided, parse it
    if (!parsedRows && csvText) {
      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        const err = new Error('CSV must contain at least a header and one data row');
        err.statusCode = 400;
        throw err;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        parsedRows.push(rowObj);
      }
    }

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      const err = new Error('No valid rows provided for CSV import');
      err.statusCode = 400;
      throw err;
    }

    const marksEntries = [];
    const report = { imported: 0, skipped: 0, errors: [] };

    for (let rowIndex = 0; rowIndex < parsedRows.length; rowIndex++) {
      const row = parsedRows[rowIndex];

      // Identify roll number key (e.g. rollNo, roll_no, RollNo, Roll Number, roll)
      const rollKey = Object.keys(row).find((k) =>
        ['ROLLNO', 'ROLL_NO', 'ROLL', 'ROLL NUMBER', 'STUDENT'].includes(k.toUpperCase().trim())
      );

      if (!rollKey || !row[rollKey]) {
        report.errors.push({ row: rowIndex + 1, reason: 'Missing roll number' });
        report.skipped++;
        continue;
      }

      const rollVal = String(row[rollKey]).toUpperCase().trim();
      const student = rollToStudent.get(rollVal);

      if (!student) {
        report.errors.push({
          row: rowIndex + 1,
          rollNo: rollVal,
          reason: `Student ${rollVal} is not enrolled in this course`,
        });
        report.skipped++;
        continue;
      }

      // Process question columns
      let rowErrors = false;
      for (const [key, value] of Object.entries(row)) {
        if (key === rollKey) continue;
        const normalizedKey = key.toUpperCase().trim();
        const question = labelToQuestion.get(normalizedKey);

        if (!question) continue; // ignore non-question columns

        let finalMarks = null;
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          const num = Number(value);
          if (isNaN(num) || num < 0 || num > question.maxMarks) {
            report.errors.push({
              row: rowIndex + 1,
              rollNo: rollVal,
              question: question.label,
              reason: `Marks ${value} out of range [0, ${question.maxMarks}]`,
            });
            rowErrors = true;
            break;
          }
          finalMarks = num;
        }

        marksEntries.push({
          studentId: student._id,
          questionId: question._id,
          marksObtained: finalMarks,
        });
      }

      if (!rowErrors) {
        report.imported++;
      }
    }

    if (marksEntries.length > 0) {
      await this.saveBulkMarks({ assessmentId, marks: marksEntries }, user);
    }

    return report;
  }
}

module.exports = new MarkService();
