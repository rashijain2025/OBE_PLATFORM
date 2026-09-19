const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const Question = require('../models/Question');
const User = require('../models/User');
const CourseEnrollment = require('../models/CourseEnrollment');
const StudentMark = require('../models/StudentMark');

/**
 * Helper: Verify assessment exists and belongs to a course assigned to the authenticated faculty.
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

    const course = await Course.findOne({
        _id: assessment.course,
        assignedFaculty: facultyId,
    });

    if (!course) {
        res.status(404);
        throw new Error('Assessment not found or course not assigned to you.');
    }

    return { assessment, course };
};

/**
 * @desc    Get all questions, enrolled students, and existing marks for an assessment
 * @route   GET /api/assessments/:assessmentId/marks
 * @access  Private (Faculty assigned to course)
 */
const getAssessmentMarks = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { assessment, course } = await verifyAssessmentOwnership(assessmentId, req.user._id, res);

        // 1. Fetch questions for this assessment
        const questions = await Question.find({ assessment: assessmentId })
            .populate('co', '_id code description')
            .sort({ questionNumber: 1, order: 1 });

        // 2. Fetch enrolled students for this course
        const enrollments = await CourseEnrollment.find({ course: course._id })
            .populate('student', '_id name email department isActive')
            .sort({ createdAt: 1 });

        // Filter and sanitize student list
        const students = enrollments
            .filter((e) => e.student)
            .map((e) => ({
                _id: e.student._id,
                name: e.student.name,
                email: e.student.email,
                department: e.student.department,
                isActive: e.student.isActive,
                enrollmentStatus: e.status,
                enrollmentDate: e.enrollmentDate,
            }));

        // 3. Fetch existing marks for this assessment
        const marks = await StudentMark.find({ assessment: assessmentId })
            .select('_id student question marksObtained evaluatedAt evaluatedBy');

        res.status(200).json({
            success: true,
            data: {
                assessment: {
                    _id: assessment._id,
                    name: assessment.name,
                    type: assessment.type,
                    totalMarks: assessment.totalMarks,
                    weightage: assessment.weightage,
                    course: {
                        _id: course._id,
                        courseCode: course.courseCode,
                        courseName: course.courseName,
                    },
                },
                questions,
                students,
                marks,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create or update marks for students and questions in an assessment (Single or Batch)
 * @route   POST /api/assessments/:assessmentId/marks
 * @access  Private (Faculty assigned to course)
 */
const saveAssessmentMarks = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const { assessment, course } = await verifyAssessmentOwnership(assessmentId, req.user._id, res);

        // Normalize body entries (supports single or batch array)
        let entries = [];
        if (Array.isArray(req.body.marks)) {
            entries = req.body.marks;
        } else if (req.body.studentId && req.body.questionId) {
            entries = [req.body];
        } else {
            res.status(400);
            return next(new Error('Provide either a marks array or { studentId, questionId, marksObtained }.'));
        }

        if (entries.length === 0) {
            res.status(400);
            return next(new Error('Marks entries array cannot be empty.'));
        }

        // Cache questions for this assessment for fast validation
        const assessmentQuestions = await Question.find({ assessment: assessmentId });
        const questionMap = new Map();
        assessmentQuestions.forEach((q) => questionMap.set(q._id.toString(), q));

        // Cache active enrollments for this course
        const courseEnrollments = await CourseEnrollment.find({ course: course._id });
        const enrolledStudentIds = new Set(courseEnrollments.map((e) => e.student.toString()));

        // Pre-validate all entries before applying any updates
        const validatedEntries = [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const { studentId, questionId, marksObtained } = entry;

            // 1. Validate IDs
            if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
                res.status(400);
                return next(new Error(`Invalid student ID at index ${i}.`));
            }

            if (!questionId || !mongoose.Types.ObjectId.isValid(questionId)) {
                res.status(400);
                return next(new Error(`Invalid question ID at index ${i}.`));
            }

            // 2. Validate Question belongs to this assessment
            const question = questionMap.get(questionId.toString());
            if (!question) {
                // Check if question belongs to another assessment or doesn't exist
                const foreignQuestion = await Question.findById(questionId);
                res.status(400);
                if (foreignQuestion) {
                    return next(new Error(`Question Q${foreignQuestion.questionNumber} belongs to another assessment, not this assessment.`));
                }
                return next(new Error(`Question not found for ID ${questionId}.`));
            }

            // 3. Validate Student exists, has student role, and is enrolled in this course
            if (!enrolledStudentIds.has(studentId.toString())) {
                const user = await User.findById(studentId);
                res.status(400);
                if (!user) {
                    return next(new Error(`Student user not found for ID ${studentId}.`));
                }
                if (user.role !== 'student') {
                    return next(new Error(`User ${user.name} is not a student (role: ${user.role}).`));
                }
                return next(new Error(`Student ${user.name} is not enrolled in course ${course.courseCode}.`));
            }

            // 4. Validate Marks value
            if (marksObtained === undefined || marksObtained === null || marksObtained === '') {
                res.status(400);
                return next(new Error(`Marks value is required for student ${studentId} on question Q${question.questionNumber}.`));
            }

            const parsedMarks = Number(marksObtained);
            if (isNaN(parsedMarks)) {
                res.status(400);
                return next(new Error(`Marks must be a valid number for question Q${question.questionNumber}. Received: ${marksObtained}`));
            }

            if (parsedMarks < 0) {
                res.status(400);
                return next(new Error(`Marks cannot be negative. Question Q${question.questionNumber} received ${parsedMarks}.`));
            }

            if (parsedMarks > question.marks) {
                res.status(400);
                return next(new Error(`Marks obtained (${parsedMarks}) cannot exceed maximum marks (${question.marks}) for Q${question.questionNumber}.`));
            }

            validatedEntries.push({
                studentId,
                questionId,
                marksObtained: parsedMarks,
            });
        }

        // Apply upserts
        const savedMarks = [];
        for (const item of validatedEntries) {
            const markDoc = await StudentMark.findOneAndUpdate(
                {
                    student: item.studentId,
                    question: item.questionId,
                },
                {
                    student: item.studentId,
                    course: course._id,
                    assessment: assessment._id,
                    question: item.questionId,
                    marksObtained: item.marksObtained,
                    evaluatedBy: req.user._id,
                    evaluatedAt: new Date(),
                },
                {
                    upsert: true,
                    returnDocument: 'after',
                    runValidators: true,
                    setDefaultsOnInsert: true,
                }
            );
            savedMarks.push(markDoc);
        }

        res.status(200).json({
            success: true,
            message: `Successfully saved marks for ${savedMarks.length} record(s).`,
            count: savedMarks.length,
            data: savedMarks,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a student's marks across assessments in a course
 * @route   GET /api/courses/:courseId/students/:studentId/marks
 * @access  Private (Faculty assigned to course)
 */
const getStudentCourseMarks = async (req, res, next) => {
    try {
        const { courseId, studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            res.status(404);
            return next(new Error('Course not found — invalid course ID.'));
        }

        const course = await Course.findOne({
            _id: courseId,
            assignedFaculty: req.user._id,
        });

        if (!course) {
            res.status(404);
            return next(new Error('Course not found or not assigned to you.'));
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            res.status(400);
            return next(new Error('Invalid student ID.'));
        }

        const marks = await StudentMark.find({
            course: courseId,
            student: studentId,
        })
            .populate('question', '_id questionNumber questionText marks co')
            .populate('assessment', '_id name type totalMarks date')
            .sort({ 'assessment.date': 1 });

        res.status(200).json({
            success: true,
            count: marks.length,
            data: marks,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAssessmentMarks,
    saveAssessmentMarks,
    getStudentCourseMarks,
};
