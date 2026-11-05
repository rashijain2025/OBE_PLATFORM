const { CourseEnrollment, Course, User } = require('../models');

/**
 * Service for Course Enrollment (single, bulk, list, remove)
 */
class EnrollmentService {
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
   * Enroll a single student into a course (no duplicates)
   */
  async enrollStudent({ courseId, studentId }, user) {
    await this.verifyCourseAccess(courseId, user);

    // Verify student exists and is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      const err = new Error('Invalid student: user not found or not a student');
      err.statusCode = 400;
      throw err;
    }

    // Check for duplicate
    const existing = await CourseEnrollment.findOne({ course: courseId, student: studentId });
    if (existing) {
      const err = new Error(`Student ${student.name} is already enrolled in this course`);
      err.statusCode = 409;
      throw err;
    }

    const enrollment = await CourseEnrollment.create({
      course: courseId,
      student: studentId,
      status: 'active',
    });

    return CourseEnrollment.findById(enrollment._id)
      .populate('student', 'name email rollNo')
      .populate('course', 'name code');
  }

  /**
   * Bulk enroll students by roll-number list (no duplicates)
   */
  async bulkEnroll({ courseId, rollNumbers }, user) {
    await this.verifyCourseAccess(courseId, user);

    const results = { enrolled: [], skipped: [], errors: [] };

    for (const rollNo of rollNumbers) {
      const trimmedRoll = rollNo.trim();
      if (!trimmedRoll) continue;

      const student = await User.findOne({ rollNo: trimmedRoll, role: 'student' });
      if (!student) {
        results.errors.push({ rollNo: trimmedRoll, reason: 'Student not found' });
        continue;
      }

      const existing = await CourseEnrollment.findOne({
        course: courseId,
        student: student._id,
      });

      if (existing) {
        results.skipped.push({ rollNo: trimmedRoll, name: student.name, reason: 'Already enrolled' });
        continue;
      }

      await CourseEnrollment.create({
        course: courseId,
        student: student._id,
        status: 'active',
      });
      results.enrolled.push({ rollNo: trimmedRoll, name: student.name });
    }

    return results;
  }

  /**
   * Class lists of the course's programme, with how many of each are already enrolled
   */
  async listClassGroupsForCourse(courseId, user) {
    const course = await this.verifyCourseAccess(courseId, user);

    const [groups, enrolledIds] = await Promise.all([
      User.aggregate([
        {
          $match: {
            role: 'student',
            isActive: true,
            programme: course.programme,
            batch: { $ne: null },
            section: { $ne: null },
          },
        },
        {
          $group: {
            _id: { batch: '$batch', section: '$section' },
            studentIds: { $push: '$_id' },
          },
        },
        { $sort: { '_id.batch': -1, '_id.section': 1 } },
      ]),
      CourseEnrollment.find({ course: courseId, status: 'active' }).distinct('student'),
    ]);

    const enrolledSet = new Set(enrolledIds.map(String));
    return groups.map((g) => ({
      batch: g._id.batch,
      section: g._id.section,
      count: g.studentIds.length,
      alreadyEnrolled: g.studentIds.filter((id) => enrolledSet.has(String(id))).length,
    }));
  }

  /**
   * Enroll every student of one class list (batch + section) into the course
   */
  async enrollClass({ courseId, batch, section }, user) {
    const course = await this.verifyCourseAccess(courseId, user);
    const students = await User.find({
      role: 'student',
      isActive: true,
      programme: course.programme,
      batch: String(batch),
      section: String(section).toUpperCase(),
    }).select('_id');

    if (students.length === 0) {
      const err = new Error(`No students found in batch ${batch}, section ${section}`);
      err.statusCode = 404;
      throw err;
    }

    const existing = await CourseEnrollment.find({ course: courseId, student: { $in: students.map((s) => s._id) } });
    const existingByStudent = new Map(existing.map((e) => [String(e.student), e]));

    let enrolled = 0;
    let reactivated = 0;
    for (const s of students) {
      const current = existingByStudent.get(String(s._id));
      if (!current) {
        await CourseEnrollment.create({ course: courseId, student: s._id, status: 'active' });
        enrolled++;
      } else if (current.status !== 'active') {
        current.status = 'active';
        await current.save();
        reactivated++;
      }
    }

    return {
      enrolled,
      reactivated,
      alreadyEnrolled: students.length - enrolled - reactivated,
      total: students.length,
    };
  }

  /**
   * List enrollments for a course
   */
  async listEnrollments({ courseId }, user) {
    if (!courseId) {
      const err = new Error('courseId query parameter is required');
      err.statusCode = 400;
      throw err;
    }

    await this.verifyCourseAccess(courseId, user);

    return CourseEnrollment.find({ course: courseId })
      .populate('student', 'name email rollNo')
      .populate('course', 'name code')
      .sort({ createdAt: 1 });
  }

  /**
   * Remove a single enrollment by enrollment _id
   */
  async removeEnrollment(enrollmentId, user) {
    const enrollment = await CourseEnrollment.findById(enrollmentId).populate('course');
    if (!enrollment) {
      const err = new Error('Enrollment not found');
      err.statusCode = 404;
      throw err;
    }

    if (user && user.role === 'faculty' && String(enrollment.course.faculty) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }

    await CourseEnrollment.findByIdAndDelete(enrollmentId);
    return { deleted: true, id: enrollmentId };
  }
}

module.exports = new EnrollmentService();
