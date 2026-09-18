/**
 * Dashboard Controller
 * ────────────────────
 * Provides dashboard data for different roles.
 * Currently implements Faculty dashboard only.
 *
 * As OBE models (Assessment, CourseOutcome, etc.) are created,
 * the remaining placeholder counts below will be replaced with real queries.
 */

const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const Assessment = require('../models/Assessment');

/**
 * @desc    Get Faculty Dashboard data
 * @route   GET /api/dashboard/faculty
 * @access  Private (requires authentication)
 */
const getFacultyDashboard = async (req, res, next) => {
    try {
        const user = req.user;

        // ── Faculty Profile (from authenticated user) ──────────────────
        const profile = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || null,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };

        // ── Find faculty course IDs ────────────────────────────────────
        const facultyCourses = await Course.find({ assignedFaculty: user._id }).select('_id isActive');
        const facultyCourseIds = facultyCourses.map(c => c._id);
        const activeCourses = facultyCourses.filter(c => c.isActive).length;

        // ── Summary Counts ─────────────────────────────────────────────
        const [totalCourseOutcomes, activeAssessments] = await Promise.all([
            CourseOutcome.countDocuments({ course: { $in: facultyCourseIds } }),
            Assessment.countDocuments({ course: { $in: facultyCourseIds }, status: 'active' }),
        ]);

        const summary = {
            totalCourses: facultyCourses.length,
            activeCourses,
            totalCourseOutcomes,
            activeAssessments,
            averageCOAttainment: null, // null indicates "not yet calculated"
        };

        // ── Recent Assessments ─────────────────────────────────────────
        const rawRecent = await Assessment.find({ course: { $in: facultyCourseIds } })
            .populate('course', 'courseName courseCode')
            .sort({ date: -1, createdAt: -1 })
            .limit(5);

        const recentAssessments = rawRecent.map(a => ({
            _id: a._id,
            name: a.name,
            courseName: a.course ? `${a.course.courseCode} - ${a.course.courseName}` : 'Unknown Course',
            type: a.type,
            date: a.date ? a.date.toISOString().split('T')[0] : '',
            status: a.status,
            totalMarks: a.totalMarks,
        }));

        // ── CO Attainment Overview ─────────────────────────────────────
        // TODO: Replace with real aggregation when attainment data exists
        const attainmentOverview = [];

        res.status(200).json({
            success: true,
            data: {
                profile,
                summary,
                recentAssessments,
                attainmentOverview,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getFacultyDashboard };
