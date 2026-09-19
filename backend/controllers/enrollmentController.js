const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');
const User = require('../models/User');

/**
 * Helper: Verify course exists and belongs to the authenticated faculty member.
 */
const verifyCourseOwnership = async (courseId, facultyId, res) => {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(404);
        throw new Error('Course not found — invalid course ID.');
    }

    const course = await Course.findOne({
        _id: courseId,
        assignedFaculty: facultyId,
    });

    if (!course) {
        res.status(404);
        throw new Error('Course not found or not assigned to you.');
    }

    return course;
};

/**
 * @desc    Get all students enrolled in a course
 * @route   GET /api/courses/:courseId/students
 * @access  Private (Faculty assigned to course)
 */
const getEnrolledStudents = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const enrollments = await CourseEnrollment.find({ course: courseId })
            .populate('student', '_id name email department isActive')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: enrollments.length,
            data: enrollments,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Enroll a student into a course
 * @route   POST /api/courses/:courseId/students/:studentId
 * @access  Private (Faculty assigned to course)
 */
const enrollStudent = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const studentId = req.params.studentId || req.body.studentId;

        const course = await verifyCourseOwnership(courseId, req.user._id, res);

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            res.status(400);
            return next(new Error('Valid student ID is required.'));
        }

        // Verify the user exists
        const studentUser = await User.findById(studentId).select('_id name email role department isActive');
        if (!studentUser) {
            res.status(404);
            return next(new Error('Student user not found.'));
        }

        // Validate role is strictly 'student'
        if (studentUser.role !== 'student') {
            res.status(400);
            return next(new Error(`User has role "${studentUser.role}". Only users with the student role can be enrolled.`));
        }

        // Check if student is already enrolled in this course
        const existingEnrollment = await CourseEnrollment.findOne({
            course: courseId,
            student: studentId,
        });

        if (existingEnrollment) {
            res.status(409);
            return next(new Error('Student is already enrolled in this course.'));
        }

        const enrollment = await CourseEnrollment.create({
            course: courseId,
            student: studentId,
            academicYear: req.body.academicYear || course.academicYear,
            status: req.body.status || 'active',
            enrollmentDate: req.body.enrollmentDate || new Date(),
        });

        const populatedEnrollment = await CourseEnrollment.findById(enrollment._id)
            .populate('student', '_id name email department isActive');

        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully.',
            data: populatedEnrollment,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('Student is already enrolled in this course.'));
        }
        next(err);
    }
};

/**
 * @desc    Remove an enrolled student from a course
 * @route   DELETE /api/courses/:courseId/students/:studentId
 * @access  Private (Faculty assigned to course)
 */
const removeStudent = async (req, res, next) => {
    try {
        const { courseId, studentId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            res.status(400);
            return next(new Error('Valid student ID is required.'));
        }

        // Attempt deletion matching either the student user ID or the enrollment record _id
        let enrollment = await CourseEnrollment.findOneAndDelete({
            course: courseId,
            student: studentId,
        });

        if (!enrollment) {
            enrollment = await CourseEnrollment.findOneAndDelete({
                course: courseId,
                _id: studentId,
            });
        }

        if (!enrollment) {
            res.status(404);
            return next(new Error('Enrollment not found for this course and student.'));
        }

        res.status(200).json({
            success: true,
            message: 'Student removed from course successfully.',
            data: {
                studentId: enrollment.student,
                enrollmentId: enrollment._id,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update enrollment status (active/inactive)
 * @route   PATCH /api/courses/:courseId/students/:studentId/status
 * @access  Private (Faculty assigned to course)
 */
const updateEnrollmentStatus = async (req, res, next) => {
    try {
        const { courseId, studentId } = req.params;
        const { status } = req.body;

        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            res.status(400);
            return next(new Error('Valid student ID is required.'));
        }

        if (!['active', 'inactive'].includes(status)) {
            res.status(400);
            return next(new Error('Status must be either "active" or "inactive".'));
        }

        const enrollment = await CourseEnrollment.findOneAndUpdate(
            {
                course: courseId,
                $or: [{ student: studentId }, { _id: studentId }],
            },
            { status },
            { returnDocument: 'after', runValidators: true }
        ).populate('student', '_id name email department isActive');

        if (!enrollment) {
            res.status(404);
            return next(new Error('Enrollment not found.'));
        }

        res.status(200).json({
            success: true,
            message: `Enrollment status updated to ${status}.`,
            data: enrollment,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Search students available for enrollment in this course
 * @route   GET /api/courses/:courseId/students/search
 * @access  Private (Faculty assigned to course)
 */
const searchAvailableStudents = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const query = req.query.q ? req.query.q.trim() : '';

        // Query users with role 'student' and active
        const filter = {
            role: 'student',
            isActive: true,
        };

        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ];
        }

        const students = await User.find(filter)
            .select('_id name email department isActive')
            .limit(30)
            .lean();

        // Get currently enrolled student IDs for this course
        const existingEnrollments = await CourseEnrollment.find({ course: courseId })
            .select('student status')
            .lean();

        const enrolledMap = new Map();
        existingEnrollments.forEach((e) => {
            enrolledMap.set(e.student.toString(), e.status);
        });

        const results = students.map((s) => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            department: s.department,
            isActive: s.isActive,
            isEnrolled: enrolledMap.has(s._id.toString()),
            enrollmentStatus: enrolledMap.get(s._id.toString()) || null,
        }));

        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEnrolledStudents,
    enrollStudent,
    removeStudent,
    updateEnrollmentStatus,
    searchAvailableStudents,
};
