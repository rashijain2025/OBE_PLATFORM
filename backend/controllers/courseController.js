const Course = require('../models/Course');

/**
 * Course Controller
 * ─────────────────
 * Handles course-related API requests.
 * Currently implements faculty course listing and single course retrieval.
 */

/**
 * @desc    Get courses assigned to the logged-in faculty
 * @route   GET /api/courses/my-courses
 * @access  Private (requires authentication)
 */
const getMyCourses = async (req, res, next) => {
    try {
        const facultyId = req.user._id;

        const courses = await Course.find({ assignedFaculty: facultyId })
            .select('-__v')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single course by ID (only if assigned to the logged-in faculty)
 * @route   GET /api/courses/:courseId
 * @access  Private (requires authentication)
 */
const getCourseById = async (req, res, next) => {
    try {
        const facultyId = req.user._id;
        const { courseId } = req.params;

        const course = await Course.findOne({
            _id: courseId,
            assignedFaculty: facultyId,
        })
            .select('-__v')
            .populate('assignedFaculty', 'name email department');

        if (!course) {
            res.status(404);
            return next(new Error('Course not found or not assigned to you.'));
        }

        res.status(200).json({
            success: true,
            data: course,
        });
    } catch (err) {
        // Handle invalid ObjectId format
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            res.status(404);
            return next(new Error('Course not found — invalid course ID.'));
        }
        next(err);
    }
};

module.exports = { getMyCourses, getCourseById };
