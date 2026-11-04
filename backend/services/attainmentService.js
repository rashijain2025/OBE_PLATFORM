const xlsx = require('xlsx');
const {
  Course, CourseOutcome, Question, CourseEnrollment, StudentMarks,
  Assessment, PO, PSO, COPOMapping, COPSOMapping,
} = require('../models');

class AttainmentService {
  async verifyCourseAccess(courseId, user) {
    const course = await Course.findById(courseId)
      .populate('faculty', 'name email')
      .populate('programme', 'name code');

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    if (user && user.role === 'faculty' && String(course.faculty._id) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }

    return course;
  }

  /**
   * Calculate Course CO Attainment
   *
   * per student per CO = sum(obtained on mapped evaluated questions) / sum(max of those questions) * 100
   * attained if >= target
   * Class CO attainment = students attained / students evaluated * 100
   * Unevaluated students excluded, not zero
   * Return "x of y evaluated"
   */
  async calculateCourseCOAttainment(courseId, target = 40, user = null) {
    const targetThreshold = Number(target) || 40;
    const course = await this.verifyCourseAccess(courseId, user);

    // 1. Fetch Course Outcomes
    const outcomes = await CourseOutcome.find({ course: courseId }).sort({ code: 1 });

    // 2. Fetch Questions mapped to COs
    const questions = await Question.find({ course: courseId });

    // 3. Fetch active enrolled students
    const enrollments = await CourseEnrollment.find({ course: courseId, status: 'active' })
      .populate('student', 'name email rollNo')
      .sort({ createdAt: 1 });

    const enrolledStudents = enrollments.map((e) => e.student).filter(Boolean);
    const totalEnrolled = enrolledStudents.length;

    // 4. Fetch all marks recorded for this course
    const marks = await StudentMarks.find({ course: courseId });
    const markMap = new Map();
    for (const m of marks) {
      const key = `${String(m.student)}_${String(m.question)}`;
      markMap.set(key, m.marksObtained);
    }

    // 5. Calculate attainment per Course Outcome
    const cosAttainment = outcomes.map((co) => {
      const coIdStr = String(co._id);
      // A question mapped to several COs counts in full towards each of them
      const coQuestions = questions.filter((q) => Question.coIdsOf(q).includes(coIdStr));
      const mappedQuestionsCount = coQuestions.length;
      const coMaxMarks = coQuestions.reduce((sum, q) => sum + q.maxMarks, 0);

      // Case: No questions mapped
      if (mappedQuestionsCount === 0 || coMaxMarks === 0) {
        return {
          coId: co._id,
          code: co.code,
          statement: co.statement,
          bloomLevel: co.bloomLevel,
          mappedQuestionsCount: 0,
          maxMarks: 0,
          studentsEvaluated: 0,
          studentsAttained: 0,
          classAttainment: null,
          evaluatedText: `0 of ${totalEnrolled} evaluated`,
          targetThreshold,
          status: 'No Questions',
          remarks: 'No questions mapped to this Course Outcome.',
          studentsBreakdown: [],
        };
      }

      // Case: No students enrolled
      if (totalEnrolled === 0) {
        return {
          coId: co._id,
          code: co.code,
          statement: co.statement,
          bloomLevel: co.bloomLevel,
          mappedQuestionsCount,
          maxMarks: coMaxMarks,
          studentsEvaluated: 0,
          studentsAttained: 0,
          classAttainment: null,
          evaluatedText: '0 of 0 evaluated',
          targetThreshold,
          status: 'No Students',
          remarks: 'No students enrolled in this course.',
          studentsBreakdown: [],
        };
      }

      const studentsBreakdown = [];
      let studentsAttainedCount = 0;
      let evaluatedCount = 0;

      for (const student of enrolledStudents) {
        const studentIdStr = String(student._id);
        let marksObtained = 0;
        let evaluatedMaxMarks = 0;
        let hasEvaluatedMark = false;

        for (const q of coQuestions) {
          const key = `${studentIdStr}_${String(q._id)}`;
          if (markMap.has(key)) {
            const markVal = markMap.get(key);
            if (markVal !== null && markVal !== undefined) {
              marksObtained += markVal;
              evaluatedMaxMarks += q.maxMarks;
              hasEvaluatedMark = true;
            }
          }
        }

        if (hasEvaluatedMark && evaluatedMaxMarks > 0) {
          evaluatedCount++;
          const studentPercentage = Number(((marksObtained / evaluatedMaxMarks) * 100).toFixed(1));
          const isAttained = studentPercentage >= targetThreshold;
          if (isAttained) studentsAttainedCount++;

          studentsBreakdown.push({
            studentId: student._id,
            name: student.name,
            rollNo: student.rollNo || 'N/A',
            marksObtained: Number(marksObtained.toFixed(2)),
            maxMarks: evaluatedMaxMarks,
            percentage: studentPercentage,
            isAttained,
            isEvaluated: true,
          });
        } else {
          // Unevaluated student: excluded from class attainment, not zero!
          studentsBreakdown.push({
            studentId: student._id,
            name: student.name,
            rollNo: student.rollNo || 'N/A',
            marksObtained: null,
            maxMarks: coMaxMarks,
            percentage: null,
            isAttained: false,
            isEvaluated: false,
          });
        }
      }

      const evaluatedText = `${evaluatedCount} of ${totalEnrolled} evaluated`;

      // Case: No evaluated students yet
      if (evaluatedCount === 0) {
        return {
          coId: co._id,
          code: co.code,
          statement: co.statement,
          bloomLevel: co.bloomLevel,
          mappedQuestionsCount,
          maxMarks: coMaxMarks,
          studentsEvaluated: 0,
          studentsAttained: 0,
          classAttainment: null,
          evaluatedText,
          targetThreshold,
          status: 'No Marks',
          remarks: 'Questions exist but no student marks recorded.',
          studentsBreakdown,
        };
      }

      const classAttainment = Number(((studentsAttainedCount / evaluatedCount) * 100).toFixed(1));
      const isAttained = classAttainment >= targetThreshold;
      const gap = !isAttained ? Number((targetThreshold - classAttainment).toFixed(1)) : 0;

      return {
        coId: co._id,
        code: co.code,
        statement: co.statement,
        bloomLevel: co.bloomLevel,
        mappedQuestionsCount,
        maxMarks: coMaxMarks,
        studentsEvaluated: evaluatedCount,
        studentsAttained: studentsAttainedCount,
        classAttainment,
        targetThreshold,
        gap,
        evaluatedText,
        status: isAttained ? 'Attained' : 'Below Target',
        remarks: `${studentsAttainedCount} of ${evaluatedCount} evaluated students attained >= ${targetThreshold}%.`,
        studentsBreakdown,
      };
    });

    // 6. Summary metrics
    const evaluatedCOs = cosAttainment.filter((c) => c.classAttainment !== null);
    const attainedCOs = evaluatedCOs.filter((c) => c.status === 'Attained');
    const belowTargetCOs = evaluatedCOs.filter((c) => c.status === 'Below Target');

    const averageAttainment =
      evaluatedCOs.length > 0
        ? Number((evaluatedCOs.reduce((sum, c) => sum + c.classAttainment, 0) / evaluatedCOs.length).toFixed(1))
        : null;

    const overallStatus =
      averageAttainment !== null
        ? averageAttainment >= targetThreshold
          ? 'Attained'
          : 'Below Target'
        : 'Pending Evaluation';

    return {
      course: {
        _id: course._id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        credits: course.credits,
        faculty: course.faculty,
        programme: course.programme,
      },
      targetThreshold,
      totalEnrolledStudents: totalEnrolled,
      totalCourseOutcomes: outcomes.length,
      evaluatedCOsCount: evaluatedCOs.length,
      attainedCOsCount: attainedCOs.length,
      belowTargetCOsCount: belowTargetCOs.length,
      averageAttainment,
      overallStatus,
      cos: cosAttainment,
      belowTargetCOs,
    };
  }

  /**
   * Generate CSV content for course attainment report
   */
  async generateAttainmentCSV(courseId, target = 40, user = null) {
    const data = await this.calculateCourseCOAttainment(courseId, target, user);
    const lines = [];

    // Course Metadata
    lines.push(`COURSE ATTAINMENT REPORT`);
    lines.push(`Course Code,${data.course.code}`);
    lines.push(`Course Name,"${data.course.name}"`);
    lines.push(`Programme,"${data.course.programme?.name || ''}"`);
    lines.push(`Academic Year,${data.course.academicYear}`);
    lines.push(`Semester,${data.course.semester}`);
    lines.push(`Faculty,"${data.course.faculty?.name || ''}"`);
    lines.push(`Target Threshold,${data.targetThreshold}%`);
    lines.push(`Overall Attainment,${data.averageAttainment !== null ? data.averageAttainment + '%' : 'N/A'}`);
    lines.push(`Overall Status,${data.overallStatus}`);
    lines.push(``);

    // Section 1: Class-Wise CO Attainment Table
    lines.push(`CLASS-WISE COURSE OUTCOMES ATTAINMENT`);
    lines.push(`CO Code,Bloom Level,Statement,Coverage,Evaluated,Attained,Class Attainment (%),Target (%),Status,Gap (%)`);
    for (const co of data.cos) {
      lines.push(
        [
          co.code,
          `"${co.bloomLevel || ''}"`,
          `"${co.statement ? co.statement.replace(/"/g, '""') : ''}"`,
          `"${co.evaluatedText}"`,
          co.studentsEvaluated,
          co.studentsAttained,
          co.classAttainment !== null ? co.classAttainment : 'N/A',
          co.targetThreshold,
          co.status,
          co.gap || 0,
        ].join(',')
      );
    }
    lines.push(``);

    // Section 2: Student-Wise Attainment Matrix
    lines.push(`STUDENT-WISE CO ATTAINMENT MATRIX`);
    const coHeaders = data.cos.map((c) => `${c.code} (%)`);
    lines.push(`Roll No,Student Name,${coHeaders.join(',')}`);

    // Map each student to their percentages across COs
    const studentMap = new Map();
    for (const co of data.cos) {
      for (const s of co.studentsBreakdown) {
        if (!studentMap.has(String(s.studentId))) {
          studentMap.set(String(s.studentId), {
            rollNo: s.rollNo,
            name: s.name,
            percentages: {},
          });
        }
        studentMap.get(String(s.studentId)).percentages[co.code] =
          s.isEvaluated ? s.percentage : 'Not Evaluated';
      }
    }

    for (const s of studentMap.values()) {
      const coVals = data.cos.map((co) => s.percentages[co.code] ?? 'N/A');
      lines.push([s.rollNo, `"${s.name}"`, ...coVals].join(','));
    }

    return lines.join('\n');
  }

  /**
   * One-click course report as an Excel workbook: summary, CO attainment, CO-PO/PSO matrix,
   * question papers, student-wise CO scores and a remarks sheet for below-target COs.
   */
  async generateCourseReportWorkbook(courseId, target = 40, user = null) {
    const data = await this.calculateCourseCOAttainment(courseId, target, user);
    const course = data.course;
    const programmeId = course.programme?._id || course.programme;

    const [pos, psos, poMaps, psoMaps, assessments, questions] = await Promise.all([
      PO.find({ programme: programmeId }),
      PSO.find({ programme: programmeId }),
      COPOMapping.find({ course: courseId }),
      COPSOMapping.find({ course: courseId }),
      Assessment.find({ course: courseId }).sort({ date: 1, createdAt: 1 }),
      Question.find({ course: courseId }).populate('cos', 'code').populate('co', 'code'),
    ]);
    const byCode = (a, b) => a.code.localeCompare(b.code, undefined, { numeric: true });
    pos.sort(byCode);
    psos.sort(byCode);

    const pct = (v) => (v === null || v === undefined ? 'N/A' : v);
    const sheets = [];

    // 1. Summary
    sheets.push({
      name: 'Summary',
      widths: [28, 60],
      rows: [
        ['COURSE ATTAINMENT REPORT'],
        [],
        ['Course Code', course.code],
        ['Course Name', course.name],
        ['Programme', course.programme?.name || ''],
        ['Academic Year', course.academicYear],
        ['Semester', course.semester],
        ['Credits', course.credits],
        ['Faculty', course.faculty?.name || ''],
        [],
        ['Attainment Threshold (%)', data.targetThreshold],
        ['Students Enrolled', data.totalEnrolledStudents],
        ['Course Outcomes', data.totalCourseOutcomes],
        ['COs Evaluated', data.evaluatedCOsCount],
        ['COs Attained', data.attainedCOsCount],
        ['COs Below Target', data.belowTargetCOsCount],
        ['Average CO Attainment (%)', pct(data.averageAttainment)],
        ['Overall Status', data.overallStatus],
        [],
        ['Generated On', new Date().toLocaleString('en-IN')],
        [
          'Method',
          `A student attains a CO when they score at least ${data.targetThreshold}% of that CO's marks; ` +
            `a CO is attained when at least ${data.targetThreshold}% of evaluated students attain it. ` +
            'Absent and not-entered marks are excluded.',
        ],
      ],
    });

    // 2. CO attainment
    sheets.push({
      name: 'CO Attainment',
      widths: [8, 16, 60, 10, 10, 11, 11, 14, 12, 14, 9],
      rows: [
        ['CO', 'Bloom Level', 'Statement', 'Questions', 'Max Marks', 'Evaluated', 'Attained', 'Attainment (%)', 'Threshold (%)', 'Status', 'Gap (%)'],
        ...data.cos.map((co) => [
          co.code,
          co.bloomLevel || '',
          co.statement || '',
          co.mappedQuestionsCount,
          co.maxMarks,
          co.studentsEvaluated,
          co.studentsAttained,
          pct(co.classAttainment),
          co.targetThreshold,
          co.status,
          co.gap || 0,
        ]),
      ],
    });

    // 3. CO-PO / CO-PSO matrix with the average strength per outcome
    const strength = new Map();
    for (const m of poMaps) strength.set(`${m.courseOutcome}|${m.programOutcome}`, m.correlationLevel);
    for (const m of psoMaps) strength.set(`${m.courseOutcome}|${m.programSpecificOutcome}`, m.correlationLevel);
    const outcomes = [...pos, ...psos];
    const matrixRows = data.cos.map((co) => [
      co.code,
      ...outcomes.map((o) => strength.get(`${co.coId}|${o._id}`) || ''),
    ]);
    const averages = outcomes.map((o, i) => {
      const vals = matrixRows.map((r) => r[i + 1]).filter((v) => v !== '');
      return vals.length ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) : '';
    });
    sheets.push({
      name: 'CO-PO Matrix',
      widths: [10, ...outcomes.map(() => 7)],
      rows: [
        ['CO', ...outcomes.map((o) => o.code)],
        ...matrixRows,
        ['Average', ...averages],
        [],
        ['Strength: 1 = Low, 2 = Medium, 3 = High. Blank = not mapped.'],
      ],
    });

    // 4. Question papers
    const naturalLabel = (a, b) => a.label.localeCompare(b.label, undefined, { numeric: true });
    const paperRows = [['Assessment', 'Assessment Max', 'Question', 'Marks', 'CO']];
    for (const a of assessments) {
      const qs = questions.filter((q) => String(q.assessment) === String(a._id)).sort(naturalLabel);
      if (qs.length === 0) paperRows.push([a.name, a.maxMarks, '(no questions)', '', '']);
      qs.forEach((q, i) => paperRows.push([i === 0 ? a.name : '', i === 0 ? a.maxMarks : '', q.label, q.maxMarks, (q.cos?.length ? q.cos : [q.co]).filter(Boolean).map((c) => c.code).join(', ')]));
    }
    sheets.push({ name: 'Question Papers', widths: [26, 15, 10, 8, 8], rows: paperRows });

    // 5. Student-wise CO scores
    const students = new Map();
    for (const co of data.cos) {
      for (const s of co.studentsBreakdown) {
        const key = String(s.studentId);
        if (!students.has(key)) students.set(key, { rollNo: s.rollNo, name: s.name, scores: {} });
        students.get(key).scores[co.code] = s.isEvaluated ? s.percentage : 'Not evaluated';
      }
    }
    const studentRows = [...students.values()].sort((a, b) =>
      String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })
    );
    sheets.push({
      name: 'Student-wise',
      widths: [16, 28, ...data.cos.map(() => 11)],
      rows: [
        ['Roll No', 'Name', ...data.cos.map((c) => `${c.code} (%)`)],
        ...studentRows.map((s) => [s.rollNo, s.name, ...data.cos.map((c) => s.scores[c.code] ?? 'N/A')]),
      ],
    });

    // 6. Remarks for COs below target, left for faculty to complete
    const below = data.cos.filter((c) => c.status === 'Below Target');
    sheets.push({
      name: 'Remarks',
      widths: [8, 14, 13, 9, 45, 45],
      rows: [
        ['CO', 'Attainment (%)', 'Threshold (%)', 'Gap (%)', 'Reason / Analysis', 'Action Proposed'],
        ...(below.length
          ? below.map((c) => [c.code, c.classAttainment, c.targetThreshold, c.gap, '', ''])
          : [['All evaluated COs met the threshold.']]),
      ],
    });

    const workbook = xlsx.utils.book_new();
    for (const { name, rows, widths } of sheets) {
      const sheet = xlsx.utils.aoa_to_sheet(rows);
      sheet['!cols'] = widths.map((wch) => ({ wch }));
      xlsx.utils.book_append_sheet(workbook, sheet, name);
    }

    return {
      buffer: xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
      filename: `${course.code}_${course.academicYear}_Course_Report.xlsx`.replace(/[^\w.-]+/g, '_'),
    };
  }
}

module.exports = new AttainmentService();
