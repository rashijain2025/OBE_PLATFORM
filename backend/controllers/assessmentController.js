const mongoose = require('mongoose');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');

/**
 * Helper: Verify Course exists and is assigned to the authenticated faculty member.
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
 * @desc    Get all assessments for a specific course
 * @route   GET /api/courses/:courseId/assessments
 * @access  Private (Assigned Faculty)
 */
const getCourseAssessments = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const assessments = await Assessment.find({ course: courseId })
            .select('-__v')
            .sort({ date: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: assessments.length,
            data: assessments,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single assessment by ID
 * @route   GET /api/courses/:courseId/assessments/:assessmentId
 * @access  Private (Assigned Faculty)
 */
const getAssessmentById = async (req, res, next) => {
    try {
        const { courseId, assessmentId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            res.status(404);
            return next(new Error('Assessment not found — invalid assessment ID.'));
        }

        const assessment = await Assessment.findOne({
            _id: assessmentId,
            course: courseId,
        }).select('-__v');

        if (!assessment) {
            res.status(404);
            return next(new Error('Assessment not found in this course.'));
        }

        res.status(200).json({
            success: true,
            data: assessment,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create a new assessment for a course
 * @route   POST /api/courses/:courseId/assessments
 * @access  Private (Assigned Faculty)
 */
const createAssessment = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        const { name, type, totalMarks, weightage, date, status, description } = req.body;

        if (!name || !name.trim()) {
            res.status(400);
            return next(new Error('Assessment name is required.'));
        }

        if (totalMarks === undefined || totalMarks === null || isNaN(Number(totalMarks)) || Number(totalMarks) < 1) {
            res.status(400);
            return next(new Error('Total marks must be a number of at least 1.'));
        }

        const trimmedName = name.trim();

        // Check for duplicate assessment name within this course
        const existing = await Assessment.findOne({
            course: courseId,
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        });

        if (existing) {
            res.status(409);
            return next(new Error(`An assessment with the name "${trimmedName}" already exists for this course.`));
        }

        const assessment = await Assessment.create({
            course: courseId,
            name: trimmedName,
            type: type || 'Internal',
            totalMarks: Number(totalMarks),
            weightage: weightage !== undefined && weightage !== '' ? Number(weightage) : 0,
            date: date ? new Date(date) : new Date(),
            status: status || 'active',
            description: description ? description.trim() : '',
        });

        res.status(201).json({
            success: true,
            message: 'Assessment created successfully.',
            data: assessment,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('An assessment with this name already exists for this course.'));
        }
        next(err);
    }
};

/**
 * @desc    Update an assessment
 * @route   PUT /api/courses/:courseId/assessments/:assessmentId
 * @access  Private (Assigned Faculty)
 */
const updateAssessment = async (req, res, next) => {
    try {
        const { courseId, assessmentId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            res.status(404);
            return next(new Error('Assessment not found — invalid assessment ID.'));
        }

        const assessment = await Assessment.findOne({
            _id: assessmentId,
            course: courseId,
        });

        if (!assessment) {
            res.status(404);
            return next(new Error('Assessment not found in this course.'));
        }

        const { name, type, totalMarks, weightage, date, status, description } = req.body;

        if (name !== undefined) {
            if (!name.trim()) {
                res.status(400);
                return next(new Error('Assessment name cannot be empty.'));
            }
            const trimmedName = name.trim();
            if (trimmedName.toLowerCase() !== assessment.name.toLowerCase()) {
                const duplicate = await Assessment.findOne({
                    course: courseId,
                    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
                    _id: { $ne: assessmentId },
                });
                if (duplicate) {
                    res.status(409);
                    return next(new Error(`An assessment with the name "${trimmedName}" already exists for this course.`));
                }
            }
            assessment.name = trimmedName;
        }

        if (type !== undefined) assessment.type = type;

        if (totalMarks !== undefined) {
            const marks = Number(totalMarks);
            if (isNaN(marks) || marks < 1) {
                res.status(400);
                return next(new Error('Total marks must be a number of at least 1.'));
            }
            assessment.totalMarks = marks;
        }

        if (weightage !== undefined && weightage !== '') {
            const wt = Number(weightage);
            if (isNaN(wt) || wt < 0 || wt > 100) {
                res.status(400);
                return next(new Error('Weightage must be between 0 and 100.'));
            }
            assessment.weightage = wt;
        }

        if (date !== undefined) assessment.date = new Date(date);
        if (status !== undefined) assessment.status = status;
        if (description !== undefined) assessment.description = description.trim();

        await assessment.save();

        res.status(200).json({
            success: true,
            message: 'Assessment updated successfully.',
            data: assessment,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('An assessment with this name already exists for this course.'));
        }
        next(err);
    }
};

/**
 * @desc    Delete an assessment
 * @route   DELETE /api/courses/:courseId/assessments/:assessmentId
 * @access  Private (Assigned Faculty)
 */
const deleteAssessment = async (req, res, next) => {
    try {
        const { courseId, assessmentId } = req.params;
        await verifyCourseOwnership(courseId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            res.status(404);
            return next(new Error('Assessment not found — invalid assessment ID.'));
        }

        const assessment = await Assessment.findOneAndDelete({
            _id: assessmentId,
            course: courseId,
        });

        if (!assessment) {
            res.status(404);
            return next(new Error('Assessment not found in this course.'));
        }

        res.status(200).json({
            success: true,
            message: 'Assessment deleted successfully.',
            data: { _id: assessment._id, name: assessment.name },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all assessments across all courses assigned to logged-in faculty
 * @route   GET /api/assessments
 * @access  Private (Faculty)
 */
const getMyAssessments = async (req, res, next) => {
    try {
        const facultyCourses = await Course.find({ assignedFaculty: req.user._id }).select('_id courseName courseCode department');
        const courseIds = facultyCourses.map(c => c._id);

        const assessments = await Assessment.find({ course: { $in: courseIds } })
            .populate('course', 'courseCode courseName department semester')
            .select('-__v')
            .sort({ date: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: assessments.length,
            data: assessments,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCourseAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getMyAssessments,
};
