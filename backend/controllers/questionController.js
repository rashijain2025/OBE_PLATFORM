const mongoose = require('mongoose');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const CourseOutcome = require('../models/CourseOutcome');
const Question = require('../models/Question');

/**
 * Helper: Verify Course exists and belongs to the authenticated faculty.
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
 * Helper: Verify Assessment exists and belongs to the given course.
 * Also verifies faculty ownership of the course.
 */
const verifyAssessmentOwnership = async (assessmentId, facultyId, res) => {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        res.status(404);
        throw new Error('Assessment not found — invalid assessment ID.');
    }

    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
        res.status(404);
        throw new Error('Assessment not found.');
    }

    // Verify the course that this assessment belongs to is owned by the faculty
    const course = await verifyCourseOwnership(
        assessment.course.toString(),
        facultyId,
        res
    );

    return { assessment, course };
};

/**
 * @desc    Get all questions for a specific assessment
 * @route   GET /api/assessments/:assessmentId/questions
 * @access  Private (Faculty who owns the course)
 */
const getQuestions = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        await verifyAssessmentOwnership(assessmentId, req.user._id, res);

        const questions = await Question.find({ assessment: assessmentId })
            .populate('co', 'code description order')
            .select('-__v')
            .sort({ questionNumber: 1, order: 1 });

        res.status(200).json({
            success: true,
            count: questions.length,
            data: questions,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create a new question for an assessment
 * @route   POST /api/assessments/:assessmentId/questions
 * @access  Private (Faculty who owns the course)
 */
const createQuestion = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { assessment, course } = await verifyAssessmentOwnership(
            assessmentId,
            req.user._id,
            res
        );

        const { questionText, questionNumber, marks, co, questionType, order } = req.body;

        // ── Validate required fields ───────────────────────────────────
        if (!questionText || !questionText.trim()) {
            res.status(400);
            return next(new Error('Question text is required.'));
        }

        if (questionNumber === undefined || questionNumber === null || isNaN(Number(questionNumber)) || Number(questionNumber) < 1) {
            res.status(400);
            return next(new Error('Question number must be a positive integer.'));
        }

        if (marks === undefined || marks === null || isNaN(Number(marks)) || Number(marks) < 0.5) {
            res.status(400);
            return next(new Error('Marks must be a number of at least 0.5.'));
        }

        if (!co) {
            res.status(400);
            return next(new Error('Course Outcome (CO) mapping is required.'));
        }

        // ── Validate CO belongs to the SAME course ─────────────────────
        if (!mongoose.Types.ObjectId.isValid(co)) {
            res.status(400);
            return next(new Error('Invalid Course Outcome ID.'));
        }

        const courseOutcome = await CourseOutcome.findOne({
            _id: co,
            course: assessment.course,
        });

        if (!courseOutcome) {
            res.status(400);
            return next(new Error('Selected Course Outcome does not belong to this course. Cross-course CO mapping is not allowed.'));
        }

        // ── Check for duplicate question number ────────────────────────
        const existingQuestion = await Question.findOne({
            assessment: assessmentId,
            questionNumber: Number(questionNumber),
        });

        if (existingQuestion) {
            res.status(409);
            return next(new Error(`Question number ${questionNumber} already exists in this assessment.`));
        }

        // ── Create the question ────────────────────────────────────────
        const question = await Question.create({
            assessment: assessmentId,
            course: assessment.course,
            questionText: questionText.trim(),
            questionNumber: Number(questionNumber),
            marks: Number(marks),
            co: co,
            questionType: questionType || 'Short Answer',
            order: order !== undefined && order !== null && order !== '' ? Number(order) : Number(questionNumber),
            isActive: true,
        });

        // Populate CO for the response
        await question.populate('co', 'code description order');

        res.status(201).json({
            success: true,
            message: 'Question created successfully.',
            data: question,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('A question with this number already exists in this assessment.'));
        }
        next(err);
    }
};

/**
 * @desc    Update a question
 * @route   PUT /api/assessments/:assessmentId/questions/:questionId
 * @access  Private (Faculty who owns the course)
 */
const updateQuestion = async (req, res, next) => {
    try {
        const { assessmentId, questionId } = req.params;
        const { assessment } = await verifyAssessmentOwnership(
            assessmentId,
            req.user._id,
            res
        );

        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            res.status(404);
            return next(new Error('Question not found — invalid question ID.'));
        }

        const question = await Question.findOne({
            _id: questionId,
            assessment: assessmentId,
        });

        if (!question) {
            res.status(404);
            return next(new Error('Question not found in this assessment.'));
        }

        const { questionText, questionNumber, marks, co, questionType, order, isActive } = req.body;

        // ── Validate and apply fields ──────────────────────────────────
        if (questionText !== undefined) {
            if (!questionText.trim()) {
                res.status(400);
                return next(new Error('Question text cannot be empty.'));
            }
            question.questionText = questionText.trim();
        }

        if (questionNumber !== undefined) {
            const num = Number(questionNumber);
            if (isNaN(num) || num < 1) {
                res.status(400);
                return next(new Error('Question number must be a positive integer.'));
            }

            // Check uniqueness if changing question number
            if (num !== question.questionNumber) {
                const duplicate = await Question.findOne({
                    assessment: assessmentId,
                    questionNumber: num,
                    _id: { $ne: questionId },
                });
                if (duplicate) {
                    res.status(409);
                    return next(new Error(`Question number ${num} already exists in this assessment.`));
                }
            }
            question.questionNumber = num;
        }

        if (marks !== undefined) {
            const m = Number(marks);
            if (isNaN(m) || m < 0.5) {
                res.status(400);
                return next(new Error('Marks must be a number of at least 0.5.'));
            }
            question.marks = m;
        }

        if (co !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(co)) {
                res.status(400);
                return next(new Error('Invalid Course Outcome ID.'));
            }

            const courseOutcome = await CourseOutcome.findOne({
                _id: co,
                course: assessment.course,
            });

            if (!courseOutcome) {
                res.status(400);
                return next(new Error('Selected Course Outcome does not belong to this course. Cross-course CO mapping is not allowed.'));
            }
            question.co = co;
        }

        if (questionType !== undefined) question.questionType = questionType;
        if (order !== undefined && order !== null && order !== '') {
            const o = Number(order);
            if (isNaN(o) || o < 1) {
                res.status(400);
                return next(new Error('Order must be at least 1.'));
            }
            question.order = o;
        }
        if (isActive !== undefined) question.isActive = Boolean(isActive);

        await question.save();
        await question.populate('co', 'code description order');

        res.status(200).json({
            success: true,
            message: 'Question updated successfully.',
            data: question,
        });
    } catch (err) {
        if (err.code === 11000) {
            res.status(409);
            return next(new Error('A question with this number already exists in this assessment.'));
        }
        next(err);
    }
};

/**
 * @desc    Delete a question
 * @route   DELETE /api/assessments/:assessmentId/questions/:questionId
 * @access  Private (Faculty who owns the course)
 */
const deleteQuestion = async (req, res, next) => {
    try {
        const { assessmentId, questionId } = req.params;
        await verifyAssessmentOwnership(assessmentId, req.user._id, res);

        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            res.status(404);
            return next(new Error('Question not found — invalid question ID.'));
        }

        const question = await Question.findOneAndDelete({
            _id: questionId,
            assessment: assessmentId,
        });

        if (!question) {
            res.status(404);
            return next(new Error('Question not found in this assessment.'));
        }

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully.',
            data: { _id: question._id, questionNumber: question.questionNumber },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
};
