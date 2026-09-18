const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');

/**
 * Helper: Verify Course exists and is assigned to the authenticated faculty member.
 * Returns the course document if authorized, or throws an error with HTTP status attached.
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
 * @desc    Get all Course Outcomes for a course
 * @route   GET /api/courses/:courseId/outcomes
 * @access  Private (Faculty assigned to course)
 */
const getOutcomes = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const outcomes = await CourseOutcome.find({ course: courseId })
            .select('-__v')
            .sort({ order: 1, createdAt: 1 });

        res.status(200).json({
            success: true,
            count: outcomes.length,
            data: outcomes,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create a new Course Outcome for a course
 * @route   POST /api/courses/:courseId/outcomes
 * @access  Private (Faculty assigned to course)
 */
const createOutcome = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const { code, description, order, isActive } = req.body;

        // Validation: Required fields
        if (!code || !code.trim()) {
            res.status(400);
            return next(new Error('Course Outcome code is required (e.g. CO1).'));
        }

        if (!description || !description.trim()) {
            res.status(400);
            return next(new Error('Course Outcome description is required.'));
        }

        const normalizedCode = code.trim().toUpperCase();

        // Check for duplicate CO code in the same course
        const existingOutcome = await CourseOutcome.findOne({
            course: courseId,
            code: normalizedCode,
        });

        if (existingOutcome) {
            res.status(409);
            return next(new Error(`A Course Outcome with code "${normalizedCode}" already exists for this course.`));
        }

        const outcome = await CourseOutcome.create({
            course: courseId,
            code: normalizedCode,
            description: description.trim(),
            order: order !== undefined && order !== null && order !== '' ? Number(order) : 1,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(201).json({
            success: true,
            message: 'Course Outcome created successfully.',
            data: outcome,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('A Course Outcome with this code already exists for this course.'));
        }
        next(err);
    }
};

/**
 * @desc    Update an existing Course Outcome
 * @route   PUT /api/courses/:courseId/outcomes/:outcomeId
 * @access  Private (Faculty assigned to course)
 */
const updateOutcome = async (req, res, next) => {
    try {
        const { courseId, outcomeId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(outcomeId)) {
            res.status(404);
            return next(new Error('Course Outcome not found — invalid outcome ID.'));
        }

        const outcome = await CourseOutcome.findOne({
            _id: outcomeId,
            course: courseId,
        });

        if (!outcome) {
            res.status(404);
            return next(new Error('Course Outcome not found in this course.'));
        }

        const { code, description, order, isActive } = req.body;

        if (code !== undefined) {
            if (!code.trim()) {
                res.status(400);
                return next(new Error('Course Outcome code cannot be empty.'));
            }
            const normalizedCode = code.trim().toUpperCase();

            // If changing code, verify uniqueness in this course
            if (normalizedCode !== outcome.code) {
                const duplicate = await CourseOutcome.findOne({
                    course: courseId,
                    code: normalizedCode,
                    _id: { $ne: outcomeId },
                });

                if (duplicate) {
                    res.status(409);
                    return next(new Error(`A Course Outcome with code "${normalizedCode}" already exists for this course.`));
                }
                outcome.code = normalizedCode;
            }
        }

        if (description !== undefined) {
            if (!description.trim()) {
                res.status(400);
                return next(new Error('Course Outcome description cannot be empty.'));
            }
            outcome.description = description.trim();
        }

        if (order !== undefined && order !== null && order !== '') {
            const parsedOrder = Number(order);
            if (isNaN(parsedOrder) || parsedOrder < 1) {
                res.status(400);
                return next(new Error('Order must be a number greater than or equal to 1.'));
            }
            outcome.order = parsedOrder;
        }

        if (isActive !== undefined) {
            outcome.isActive = Boolean(isActive);
        }

        await outcome.save();

        res.status(200).json({
            success: true,
            message: 'Course Outcome updated successfully.',
            data: outcome,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('A Course Outcome with this code already exists for this course.'));
        }
        next(err);
    }
};

/**
 * @desc    Delete a Course Outcome
 * @route   DELETE /api/courses/:courseId/outcomes/:outcomeId
 * @access  Private (Faculty assigned to course)
 */
const deleteOutcome = async (req, res, next) => {
    try {
        const { courseId, outcomeId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(outcomeId)) {
            res.status(404);
            return next(new Error('Course Outcome not found — invalid outcome ID.'));
        }

        const outcome = await CourseOutcome.findOneAndDelete({
            _id: outcomeId,
            course: courseId,
        });

        if (!outcome) {
            res.status(404);
            return next(new Error('Course Outcome not found in this course.'));
        }

        res.status(200).json({
            success: true,
            message: 'Course Outcome deleted successfully.',
            data: { _id: outcome._id, code: outcome.code },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getOutcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome,
};
