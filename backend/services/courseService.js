const mongoose = require('mongoose');
const {
  Course, User, CourseOutcome, Assessment, Question, CourseEnrollment, StudentMarks,
  Programme, COPOMapping, COPSOMapping,
} = require('../models');
const departmentService = require('./departmentService');

// UG (B.Tech) runs 8 semesters, PG (M.Tech) 4; other levels follow their duration
function semesterCount(programme) {
  if (programme.level === 'UG') return 8;
  if (programme.level === 'PG') return 4;
  return Math.max(1, (programme.durationYears || 4) * 2);
}

/**
 * Service for Course CRUD
 */
class CourseService {
  /**
   * Semester must exist in the programme (UG 1–8, PG 1–4) and credits must be 1–4
   */
  async validateSemesterAndCredits({ programmeId, semester, credits }) {
    if (credits !== undefined && credits !== null) {
      const c = Number(credits);
      if (!Number.isInteger(c) || c < 1 || c > 4) {
        const err = new Error('Credits must be 1, 2, 3 or 4');
        err.statusCode = 400;
        throw err;
      }
    }
    if (semester !== undefined && semester !== null) {
      const programme = await Programme.findById(programmeId).select('level durationYears name');
      if (!programme) {
        const err = new Error('Programme not found');
        err.statusCode = 404;
        throw err;
      }
      const max = semesterCount(programme);
      const s = Number(semester);
      if (!Number.isInteger(s) || s < 1 || s > max) {
        const err = new Error(`Semester must be between 1 and ${max} for ${programme.name}`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Setup progress of a course: what is defined, what is missing, how much marks entry is done
   */
  async computeProgress(courseId) {
    const [cos, assessments, questions, enrolledIds] = await Promise.all([
      CourseOutcome.find({ course: courseId }).select('code').sort({ code: 1 }),
      Assessment.find({ course: courseId }).select('name maxMarks').sort({ date: 1, createdAt: 1 }),
      Question.find({ course: courseId }).select('assessment co cos maxMarks'),
      CourseEnrollment.find({ course: courseId, status: 'active' }).distinct('student'),
    ]);

    const mappedCoIds = new Set(questions.flatMap((q) => Question.coIdsOf(q)));
    const unmappedCOs = cos.filter((co) => !mappedCoIds.has(String(co._id))).map((co) => co.code);

    const questionsByAssessment = new Map();
    for (const q of questions) {
      const key = String(q.assessment);
      if (!questionsByAssessment.has(key)) questionsByAssessment.set(key, []);
      questionsByAssessment.get(key).push(q);
    }

    // Cells with a mark or an "AB", counted only for current questions and enrolled students
    const filledCounts = await StudentMarks.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(String(courseId)),
          student: { $in: enrolledIds },
          question: { $in: questions.map((q) => q._id) },
          $or: [{ marksObtained: { $ne: null } }, { isAbsent: true }],
        },
      },
      { $group: { _id: '$assessment', filled: { $sum: 1 } } },
    ]);
    const filledByAssessment = new Map(filledCounts.map((f) => [String(f._id), f.filled]));

    const papers = assessments.map((a) => {
      const qs = questionsByAssessment.get(String(a._id)) || [];
      const marksSum = qs.reduce((sum, q) => sum + q.maxMarks, 0);
      const totalCells = qs.length * enrolledIds.length;
      return {
        assessmentId: a._id,
        name: a.name,
        questionCount: qs.length,
        paperComplete: qs.length > 0 && marksSum === a.maxMarks,
        marksFilled: filledByAssessment.get(String(a._id)) || 0,
        marksTotal: totalCells,
      };
    });

    const marksFilled = papers.reduce((s, p) => s + p.marksFilled, 0);
    const marksTotal = papers.reduce((s, p) => s + p.marksTotal, 0);

    const steps = {
      cosDefined: cos.length > 0,
      allCOsAssessed: cos.length > 0 && unmappedCOs.length === 0,
      papersComplete: papers.length > 0 && papers.every((p) => p.paperComplete),
      studentsAdded: enrolledIds.length > 0,
      marksComplete: marksTotal > 0 && marksFilled === marksTotal,
    };

    return {
      cosCount: cos.length,
      unmappedCOs,
      assessmentsCount: assessments.length,
      enrolledCount: enrolledIds.length,
      papers,
      marksFilled,
      marksTotal,
      marksPercent: marksTotal > 0 ? Math.round((marksFilled / marksTotal) * 100) : 0,
      steps,
      ready: Object.values(steps).every(Boolean),
    };
  }

  /**
   * Progress of every course the user can see: faculty → own, coordinator → own department, admin → all
   */
  async listCourseProgress(user) {
    const filter = {};
    if (user.role === 'faculty') {
      filter.faculty = user._id;
    } else if (user.role === 'coordinator') {
      const dept = user.department?._id || user.department || null;
      filter.programme = { $in: await Programme.find({ department: dept }).distinct('_id') };
    }

    const courses = await Course.find(filter)
      .populate('faculty', 'name email')
      .populate('programme', 'name code')
      .sort({ academicYear: -1, semester: 1, code: 1 });

    return Promise.all(
      courses.map(async (c) => ({
        course: {
          _id: c._id,
          code: c.code,
          name: c.name,
          semester: c.semester,
          academicYear: c.academicYear,
          faculty: c.faculty,
          programme: c.programme,
        },
        progress: await this.computeProgress(c._id),
      }))
    );
  }

  /**
   * Earlier offerings whose setup can be copied: same course code (any year/faculty), or the faculty's own courses
   */
  async listCopySources(courseId, { role, userId }) {
    const target = await this.getCourseById(courseId, { role, userId });
    const or = [{ code: target.code }];
    if (role === 'faculty') or.push({ faculty: userId });

    const candidates = await Course.find({ _id: { $ne: courseId }, $or: or })
      .populate('faculty', 'name')
      .sort({ academicYear: -1, code: 1 });

    const sources = await Promise.all(
      candidates.map(async (c) => {
        const [cosCount, assessmentsCount, questionsCount] = await Promise.all([
          CourseOutcome.countDocuments({ course: c._id }),
          Assessment.countDocuments({ course: c._id }),
          Question.countDocuments({ course: c._id }),
        ]);
        return {
          _id: c._id,
          code: c.code,
          name: c.name,
          academicYear: c.academicYear,
          semester: c.semester,
          faculty: c.faculty,
          sameCode: c.code === target.code,
          cosCount,
          assessmentsCount,
          questionsCount,
        };
      })
    );

    // Only offerings that actually have something to copy; same-code offerings first
    return sources
      .filter((s) => s.cosCount > 0)
      .sort((a, b) => Number(b.sameCode) - Number(a.sameCode));
  }

  /**
   * Copy COs, assessments, question papers and CO-PO/PSO mappings from a source course into an empty course
   */
  async copySetup(courseId, sourceCourseId, { role, userId }) {
    const target = await this.getCourseById(courseId, { role, userId });
    const allowedSources = await this.listCopySources(courseId, { role, userId });
    if (!allowedSources.some((s) => String(s._id) === String(sourceCourseId))) {
      const err = new Error('This course cannot be copied from the selected offering');
      err.statusCode = 400;
      throw err;
    }

    const [existingCOs, existingAssessments] = await Promise.all([
      CourseOutcome.countDocuments({ course: courseId }),
      Assessment.countDocuments({ course: courseId }),
    ]);
    if (existingCOs > 0 || existingAssessments > 0) {
      const err = new Error('Copying is only available for a course with no COs or assessments yet');
      err.statusCode = 409;
      throw err;
    }

    const source = await Course.findById(sourceCourseId);
    const targets = await departmentService.getTargetsForCourse(courseId);

    // 1. COs (targets follow the department's current policy)
    const sourceCOs = await CourseOutcome.find({ course: sourceCourseId }).sort({ code: 1 });
    const coIdMap = new Map();
    for (const co of sourceCOs) {
      const created = await CourseOutcome.create({
        course: courseId,
        code: co.code,
        statement: co.statement,
        bloomLevel: co.bloomLevel,
        targetMarksPercentage: targets.targetMarksPercentage,
        targetAttainmentPercentage: targets.targetAttainmentPercentage,
      });
      coIdMap.set(String(co._id), created._id);
    }

    // 2. Assessments and their question papers
    const sourceAssessments = await Assessment.find({ course: sourceCourseId }).sort({ date: 1, createdAt: 1 });
    let questionsCopied = 0;
    for (const a of sourceAssessments) {
      const created = await Assessment.create({
        course: courseId,
        name: a.name,
        type: a.type,
        maxMarks: a.maxMarks,
        weightage: a.weightage,
      });
      const sourceQuestions = await Question.find({ assessment: a._id });
      const newQuestions = sourceQuestions
        .map((q) => ({ q, cos: Question.coIdsOf(q).filter((id) => coIdMap.has(id)).map((id) => coIdMap.get(id)) }))
        .filter(({ cos }) => cos.length > 0)
        .map(({ q, cos }) => ({
          assessment: created._id,
          course: courseId,
          label: q.label,
          maxMarks: q.maxMarks,
          cos,
          co: cos[0],
        }));
      if (newQuestions.length > 0) {
        await Question.insertMany(newQuestions);
        questionsCopied += newQuestions.length;
      }
    }

    // 3. CO-PO / CO-PSO mappings, only when both offerings belong to the same programme (POs are per programme)
    let mappingsCopied = 0;
    if (String(source.programme) === String(target.programme._id || target.programme)) {
      const [poMaps, psoMaps] = await Promise.all([
        COPOMapping.find({ course: sourceCourseId }),
        COPSOMapping.find({ course: sourceCourseId }),
      ]);
      const newPoMaps = poMaps
        .filter((m) => coIdMap.has(String(m.courseOutcome)))
        .map((m) => ({
          course: courseId,
          courseOutcome: coIdMap.get(String(m.courseOutcome)),
          programOutcome: m.programOutcome,
          correlationLevel: m.correlationLevel,
        }));
      const newPsoMaps = psoMaps
        .filter((m) => coIdMap.has(String(m.courseOutcome)))
        .map((m) => ({
          course: courseId,
          courseOutcome: coIdMap.get(String(m.courseOutcome)),
          programSpecificOutcome: m.programSpecificOutcome,
          correlationLevel: m.correlationLevel,
        }));
      if (newPoMaps.length > 0) await COPOMapping.insertMany(newPoMaps);
      if (newPsoMaps.length > 0) await COPSOMapping.insertMany(newPsoMaps);
      mappingsCopied = newPoMaps.length + newPsoMaps.length;
    }

    return {
      cosCopied: sourceCOs.length,
      assessmentsCopied: sourceAssessments.length,
      questionsCopied,
      mappingsCopied,
      from: { code: source.code, academicYear: source.academicYear },
    };
  }
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
          .populate('cos', 'code statement bloomLevel')
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

    const [progress, obeTargets] = await Promise.all([
      this.computeProgress(id),
      departmentService.getTargetsForCourse(id),
    ]);

    return {
      course,
      cos,
      assessments,
      enrollmentsCount,
      progress,
      obeTargets,
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

    await this.validateSemesterAndCredits({ programmeId: programme, semester, credits });

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

    // Check against the programme the course will belong to after this update
    await this.validateSemesterAndCredits({
      programmeId: programme || existingCourse.programme,
      semester: semester !== undefined ? semester : programme ? existingCourse.semester : undefined,
      credits,
    });

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
