const xlsx = require('xlsx');
const { StudentMarks, Assessment, Question, CourseEnrollment, Course } = require('../models');

// Normalize roll number: uppercase, strip special chars, normalize 0 vs O
function normalizeRollNumber(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '')
    // Normalize university roll prefixes like BTIT24O -> BTIT240
    .replace(/O(?=\d{3,})/g, '0');
}

// Normalize question labels: 'q1', 'Q 1', 'Question 1', '1' -> 'Q1'
function normalizeQuestionLabel(label) {
  if (!label) return '';
  const s = String(label).trim().toUpperCase();
  if (/^Q\s*\.?\s*\d+/i.test(s)) {
    return s.replace(/^Q\s*\.?\s*/i, 'Q').replace(/\s+/g, '');
  }
  if (/^QUESTION\s*\.?\s*\d+/i.test(s)) {
    return s.replace(/^QUESTION\s*\.?\s*/i, 'Q').replace(/\s+/g, '');
  }
  if (/^\d+$/.test(s)) {
    return `Q${s}`;
  }
  return s.replace(/\s+/g, '');
}

function findRollKey(keys, rows) {
  for (const k of keys) {
    const clean = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (
      clean === 'ROLL' ||
      clean === 'ROLLNO' ||
      clean === 'ROLLNUM' ||
      clean === 'ROLLNUMBER' ||
      clean === 'ENROLLMENT' ||
      clean === 'ENROLLMENTNO' ||
      clean === 'REGNO' ||
      clean === 'REGISTRATIONNO' ||
      clean === 'STUDENTID' ||
      clean.startsWith('ROLL') ||
      clean.startsWith('ENROLL')
    ) {
      return k;
    }
  }
  for (const k of keys) {
    let matches = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const v = String(rows[i][k] || '').trim();
      if (/[A-Z]+\d+/i.test(v) && v.length >= 4) matches++;
    }
    if (matches >= 2) return k;
  }
  return null;
}

function findNameKey(keys) {
  for (const k of keys) {
    const clean = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (
      clean === 'NAME' ||
      clean === 'STUDENTNAME' ||
      clean === 'CANDIDATENAME' ||
      clean === 'STUDENT' ||
      clean === 'FULLNAME'
    ) {
      return k;
    }
  }
  return null;
}

function isIgnoredMetaColumn(key) {
  const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ignored = [
    'SNO', 'SRNO', 'SR', 'SERIAL', 'SERIALNO', 'INDEX', '#',
    'TOTAL', 'GRANDTOTAL', 'TOT', 'SUM',
    'PERCENT', 'PERCENTAGE', '%',
    'GRADE', 'REMARK', 'REMARKS', 'STATUS',
    'ATTENDANCE', 'SIGN', 'SIGNATURE',
    'EMAIL', 'PHONE', 'MOBILE', 'CONTACT'
  ];
  return ignored.includes(clean);
}

// "AB", "A", "ABSENT" (any case) mark a student absent for that question
function isAbsentValue(val) {
  return typeof val === 'string' && ['AB', 'A', 'ABSENT'].includes(val.trim().toUpperCase());
}

// Rows like "Max Marks" under the header in the downloaded template are not students
function isTemplateMetaRow(rollValue) {
  const clean = String(rollValue || '').toUpperCase().replace(/[^A-Z]/g, '');
  return clean === 'MAXMARKS' || clean === 'MAX' || clean === 'CO' || clean === 'COURSEOUTCOME';
}

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
      .populate('cos', 'code statement bloomLevel')
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
        marksMap[sId][qId] = m.isAbsent ? 'AB' : m.marksObtained;
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

      // Validation 3 & 4: 0 <= marks <= maxMarks, empty = not evaluated (null), "AB" = absent
      let finalMarks = null;
      const isAbsent = isAbsentValue(marksObtained);
      if (!isAbsent && marksObtained !== null && marksObtained !== undefined && marksObtained !== '') {
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
              isAbsent,
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
   * Parse uploaded rows / CSV text and check them against this assessment without saving anything.
   * Strict: only enrolled students and existing questions are accepted; nothing is auto-created.
   * Returns valid cells as `entries` plus every problem found, so faculty can review before importing.
   */
  async analyzeImport({ assessmentId, csvText, rows }, user) {
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

    let parsedRows = Array.isArray(rows) ? rows : null;
    if (!parsedRows && csvText && csvText.trim()) {
      const workbook = xlsx.read(csvText.trim(), { type: 'string' });
      parsedRows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '', raw: false });
    }
    if (!parsedRows || parsedRows.length === 0) {
      const err = new Error('No rows found in the uploaded file');
      err.statusCode = 400;
      throw err;
    }

    // Columns from every row: a sheet may leave a column empty in its first row
    const allKeys = [...new Set(parsedRows.flatMap((row) => Object.keys(row || {})))];
    const rollKey = findRollKey(allKeys, parsedRows);
    if (!rollKey) {
      const err = new Error('Could not find a Roll No column. Please use the downloaded template.');
      err.statusCode = 400;
      throw err;
    }
    const nameKey = findNameKey(allKeys);

    const questions = await Question.find({ assessment: assessmentId });
    const questionByLabel = new Map(questions.map((q) => [normalizeQuestionLabel(q.label), q]));

    const matchedColumns = [];
    const unknownColumns = [];
    for (const key of allKeys) {
      if (key === rollKey || key === nameKey || isIgnoredMetaColumn(key) || /^__EMPTY/.test(key)) continue;
      const question = questionByLabel.get(normalizeQuestionLabel(key));
      if (question) matchedColumns.push({ key, question });
      else unknownColumns.push(key);
    }
    if (matchedColumns.length === 0) {
      const err = new Error(
        `None of the columns match this paper's questions (${questions.map((q) => q.label).join(', ')}).`
      );
      err.statusCode = 400;
      throw err;
    }

    const enrollments = await CourseEnrollment.find({ course: assessment.course, status: 'active' })
      .populate('student', 'name rollNo');
    const studentByRoll = new Map();
    for (const e of enrollments) {
      if (e.student?.rollNo) studentByRoll.set(normalizeRollNumber(e.student.rollNo), e.student);
    }

    const entries = [];
    const issues = [];
    const seenStudents = new Set();
    let studentRows = 0;

    parsedRows.forEach((row, index) => {
      const rowNumber = index + 2; // header is spreadsheet row 1
      const rawRoll = String(row[rollKey] || '').trim();
      if (!rawRoll || isTemplateMetaRow(rawRoll)) return;

      const student = studentByRoll.get(normalizeRollNumber(rawRoll));
      if (!student) {
        issues.push({ row: rowNumber, rollNo: rawRoll, problem: 'Not enrolled in this course' });
        return;
      }
      if (seenStudents.has(String(student._id))) {
        issues.push({ row: rowNumber, rollNo: rawRoll, problem: 'Appears more than once; only the first row is used' });
        return;
      }
      seenStudents.add(String(student._id));
      studentRows++;

      for (const { key, question } of matchedColumns) {
        const raw = String(row[key] ?? '').trim();
        if (raw === '') continue; // blank cells leave existing marks untouched
        if (isAbsentValue(raw)) {
          entries.push({ studentId: student._id, questionId: question._id, marksObtained: 'AB' });
          continue;
        }
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0 || num > question.maxMarks) {
          issues.push({
            row: rowNumber,
            rollNo: rawRoll,
            problem: `${question.label}: "${raw}" is not a valid mark (0–${question.maxMarks} or AB)`,
          });
          continue;
        }
        entries.push({ studentId: student._id, questionId: question._id, marksObtained: num });
      }
    });

    const missingStudents = enrollments
      .filter((e) => e.student && !seenStudents.has(String(e.student._id)))
      .map((e) => ({ rollNo: e.student.rollNo, name: e.student.name }));

    return {
      entries,
      summary: {
        studentRows,
        cellsToImport: entries.length,
        questionsMatched: matchedColumns.map((c) => c.question.label),
        unknownColumns,
        issues,
        missingStudents,
      },
    };
  }

  /**
   * Import marks from Excel/CSV rows. With dryRun, only reports what would be imported.
   * Invalid cells are skipped and reported; valid cells are saved.
   */
  async importCSV({ assessmentId, csvText, rows, dryRun }, user) {
    const { entries, summary } = await this.analyzeImport({ assessmentId, csvText, rows }, user);
    if (dryRun || entries.length === 0) {
      return { ...summary, imported: 0, dryRun: Boolean(dryRun) };
    }
    await this.saveBulkMarks({ assessmentId, marks: entries }, user);
    return { ...summary, imported: entries.length, dryRun: false };
  }
}

module.exports = new MarkService();
