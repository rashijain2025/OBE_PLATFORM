const { User, Department, Programme, Course, CourseEnrollment, CourseOutcome, Assessment, Question, PO, PSO, PEO, COPOMapping } = require('../models');

/**
 * Service for the Dashboard stats endpoint — real counts per role
 */
class DashboardService {
  async getStats(user) {
    const role = user.role;

    if (role === 'admin') {
      const [
        totalUsers,
        adminCount,
        coordinatorCount,
        facultyCount,
        studentCount,
        totalDepartments,
        totalProgrammes,
        totalCourses,
        totalEnrollments,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ role: 'coordinator' }),
        User.countDocuments({ role: 'faculty' }),
        User.countDocuments({ role: 'student' }),
        Department.countDocuments(),
        Programme.countDocuments(),
        Course.countDocuments(),
        CourseEnrollment.countDocuments({ status: 'active' }),
      ]);

      return {
        role: 'admin',
        stats: {
          users: {
            total: totalUsers,
            byRole: {
              admin: adminCount,
              coordinator: coordinatorCount,
              faculty: facultyCount,
              student: studentCount,
            },
          },
          departments: totalDepartments,
          programmes: totalProgrammes,
          courses: totalCourses,
          enrollments: totalEnrollments,
        },
      };
    }

    if (role === 'coordinator') {
      const progQuery = user.department ? { department: user.department } : {};
      const progs = await Programme.find(progQuery).select('_id');
      const progIds = progs.map((p) => p._id);

      const [totalCourses, totalProgrammes, totalEnrollments, totalStudents, totalPOs, totalPSOs, totalPEOs, totalMappings] = await Promise.all([
        Course.countDocuments(progIds.length > 0 ? { programme: { $in: progIds } } : {}),
        Programme.countDocuments(progQuery),
        CourseEnrollment.countDocuments({ status: 'active' }),
        User.countDocuments({ role: 'student' }),
        PO.countDocuments(progIds.length > 0 ? { programme: { $in: progIds } } : {}),
        PSO.countDocuments(progIds.length > 0 ? { programme: { $in: progIds } } : {}),
        PEO.countDocuments(progIds.length > 0 ? { programme: { $in: progIds } } : {}),
        COPOMapping.countDocuments(),
      ]);

      return {
        role: 'coordinator',
        stats: {
          courses: totalCourses,
          programmes: totalProgrammes,
          enrollments: totalEnrollments,
          students: totalStudents,
          pos: totalPOs,
          psos: totalPSOs,
          peos: totalPEOs,
          mappings: totalMappings,
        },
      };
    }

    if (role === 'faculty') {
      const myCourses = await Course.find({ faculty: user._id }).select('_id');
      const courseIds = myCourses.map((c) => c._id);

      const [totalMyCourses, totalMyStudents, totalMyCOs, totalMyAssessments, totalMyQuestions] = await Promise.all([
        Course.countDocuments({ faculty: user._id }),
        CourseEnrollment.countDocuments({ course: { $in: courseIds }, status: 'active' }),
        CourseOutcome.countDocuments({ course: { $in: courseIds } }),
        Assessment.countDocuments({ course: { $in: courseIds } }),
        Question.countDocuments({ course: { $in: courseIds } }),
      ]);

      return {
        role: 'faculty',
        stats: {
          myCourses: totalMyCourses,
          myStudents: totalMyStudents,
          myCOs: totalMyCOs,
          myAssessments: totalMyAssessments,
          myQuestions: totalMyQuestions,
        },
      };
    }

    return { role, stats: {} };
  }
}

module.exports = new DashboardService();
