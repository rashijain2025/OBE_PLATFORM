const xlsx = require('xlsx');
const { StudentMarks, Assessment, Question, CourseEnrollment, User, Course, CourseOutcome } = require('../models');

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
   * Import marks from Excel/CSV
   * Supports parsed `rows`, raw `csvText`, or base64 `excelBase64`
   */
  async importCSV({ assessmentId, csvText, rows, excelBase64 }, user) {
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

    const course = await Course.findById(assessment.course);
    await this.verifyCourseAccess(assessment.course, user);

    let parsedRows = rows;

    // 1. Parse Excel buffer if base64 provided
    if (!parsedRows && excelBase64) {
      const buffer = Buffer.from(excelBase64, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      parsedRows = xlsx.utils.sheet_to_json(firstSheet, { defval: '' });
    }

    // 2. Parse CSV text using SheetJS for robust delimiter and quote handling
    if (!parsedRows && csvText) {
      const trimmed = csvText.trim();
      if (!trimmed) {
        const err = new Error('CSV content is empty');
        err.statusCode = 400;
        throw err;
      }
      try {
        const workbook = xlsx.read(trimmed, { type: 'string' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = xlsx.utils.sheet_to_json(firstSheet, { defval: '' });
      } catch (err) {
        // Fallback simple line split
        const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
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
      }
    }

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      const err = new Error('No valid student rows found in the uploaded file or text');
      err.statusCode = 400;
      throw err;
    }

    // 3. Inspect headers / columns
    const allKeys = Object.keys(parsedRows[0] || {});
    const rollKey = findRollKey(allKeys, parsedRows);
    if (!rollKey) {
      const err = new Error('Could not identify Roll Number column (e.g. roll num, RollNo, Enrollment)');
      err.statusCode = 400;
      throw err;
    }

    const nameKey = findNameKey(allKeys);

    // Identify question columns
    const detectedQuestionCols = [];
    for (const key of allKeys) {
      if (key === rollKey || key === nameKey || isIgnoredMetaColumn(key)) continue;
      const normLabel = normalizeQuestionLabel(key);
      detectedQuestionCols.push({ originalKey: key, normLabel });
    }

    if (detectedQuestionCols.length === 0) {
      const err = new Error('No question marks columns (e.g. Q1, Q2, Q3...) detected in the sheet');
      err.statusCode = 400;
      throw err;
    }

    // 4. Fetch or auto-create questions
    let existingQuestions = await Question.find({ assessment: assessmentId });
    const labelToQuestion = new Map();
    for (const q of existingQuestions) {
      labelToQuestion.set(normalizeQuestionLabel(q.label), q);
    }

    // If questions are missing, auto-create them mapped to Course Outcomes
    const cos = await CourseOutcome.find({ course: assessment.course }).sort({ code: 1 });
    let defaultCoId = cos[0]?._id;
    if (!defaultCoId) {
      const newCo = await CourseOutcome.create({
        course: assessment.course,
        code: 'CO1',
        statement: 'Apply core course concepts and technical problem solving.',
        bloomLevel: 'L3: Apply',
      });
      defaultCoId = newCo._id;
    }

    const autoCreatedQuestions = [];
    for (let qIdx = 0; qIdx < detectedQuestionCols.length; qIdx++) {
      const { originalKey, normLabel } = detectedQuestionCols[qIdx];
      if (!labelToQuestion.has(normLabel)) {
        // Calculate max mark from sheet data
        let maxValFound = 0;
        for (const row of parsedRows) {
          const val = Number(row[originalKey]);
          if (!isNaN(val) && val > maxValFound) {
            maxValFound = val;
          }
        }
        const computedMax = maxValFound > 0 ? (maxValFound <= 5 ? 5 : maxValFound <= 10 ? 10 : Math.ceil(maxValFound)) : 5;
        const assignedCo = cos.length > 0 ? cos[qIdx % cos.length]._id : defaultCoId;

        const newQ = await Question.create({
          assessment: assessmentId,
          course: assessment.course,
          label: normLabel,
          maxMarks: computedMax,
          co: assignedCo,
        });

        labelToQuestion.set(normLabel, newQ);
        autoCreatedQuestions.push({ label: normLabel, maxMarks: computedMax });
      }
    }

    // 5. Fetch enrolled students and all student users for intelligent auto-enrollment
    const enrollments = await CourseEnrollment.find({ course: assessment.course, status: 'active' }).populate('student');
    const rollToStudent = new Map();
    for (const e of enrollments) {
      if (e.student && e.student.rollNo) {
        rollToStudent.set(normalizeRollNumber(e.student.rollNo), e.student);
      }
    }

    const allStudentUsers = await User.find({ role: 'student' });
    const userRollMap = new Map();
    for (const u of allStudentUsers) {
      if (u.rollNo) {
        userRollMap.set(normalizeRollNumber(u.rollNo), u);
      }
    }

    const marksEntries = [];
    const report = {
      imported: 0,
      skipped: 0,
      questionsCount: detectedQuestionCols.length,
      autoCreatedQuestions,
      autoEnrolledCount: 0,
      errors: [],
    };

    // 6. Process each student row
    for (let rowIndex = 0; rowIndex < parsedRows.length; rowIndex++) {
      const row = parsedRows[rowIndex];
      const rawRoll = String(row[rollKey] || '').trim();
      const normRoll = normalizeRollNumber(rawRoll);

      if (!normRoll) {
        report.errors.push({ row: rowIndex + 1, reason: 'Missing roll number' });
        report.skipped++;
        continue;
      }

      let student = rollToStudent.get(normRoll);

      // If student not currently enrolled in course, check user collection or auto-create
      if (!student) {
        let existingUser = userRollMap.get(normRoll);
        if (!existingUser) {
          // Auto-create student user record from sheet name and roll number
          const rawName = nameKey ? String(row[nameKey] || '').trim() : '';
          const studentName = rawName || `Student ${rawRoll}`;
          existingUser = await User.create({
            name: studentName,
            rollNo: rawRoll,
            email: `${normRoll.toLowerCase()}@student.obe.edu`,
            role: 'student',
            department: course?.department || null,
            passwordHash: '$student_record_no_login$',
            isActive: true,
          });
          userRollMap.set(normRoll, existingUser);
        }

        // Auto-enroll student into this course
        await CourseEnrollment.create({
          course: assessment.course,
          student: existingUser._id,
          academicYear: course?.academicYear || '2025-2026',
          status: 'active',
        });

        student = existingUser;
        rollToStudent.set(normRoll, student);
        report.autoEnrolledCount++;
      }

      // Process marks for detected question columns
      let rowHasValidMark = false;
      for (const { originalKey, normLabel } of detectedQuestionCols) {
        const question = labelToQuestion.get(normLabel);
        if (!question) continue;

        const value = row[originalKey];
        let finalMarks = null;
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          const num = Number(value);
          if (!isNaN(num) && num >= 0) {
            // If mark exceeds question maxMarks, adjust question maxMarks dynamically to accommodate
            if (num > question.maxMarks) {
              question.maxMarks = Math.ceil(num);
              await Question.updateOne({ _id: question._id }, { maxMarks: question.maxMarks });
            }
            finalMarks = num;
            rowHasValidMark = true;
          }
        }

        marksEntries.push({
          studentId: student._id,
          questionId: question._id,
          marksObtained: finalMarks,
        });
      }

      report.imported++;
    }

    // 7. Save marks in bulk
    if (marksEntries.length > 0) {
      await this.saveBulkMarks({ assessmentId, marks: marksEntries }, user);
    }

    return report;
  }
}

module.exports = new MarkService();
