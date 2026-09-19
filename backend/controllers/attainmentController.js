const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const CourseEnrollment = require('../models/CourseEnrollment');
const StudentMark = require('../models/StudentMark');

const {
    verifyCourseOwnership,
    computeCourseAttainment,
} = require('../services/attainmentService');

/**
 * @desc    Calculate Course Outcome (CO) attainment for a course
 * @route   GET /api/courses/:courseId/attainment
 * @access  Private (Faculty assigned to course)
 */
const getCourseAttainment = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const result = await computeCourseAttainment(
            courseId,
            req.user._id,
            req.query.target
        );

        res.status(200).json({
            success: true,
            data: {
                courseId: result.course._id,
                courseCode: result.course.courseCode,
                courseName: result.course.courseName,
                targetPercentage: result.targetPercentage,
                totalEnrolledStudents: result.totalEnrolledStudents,
                totalCourseOutcomes: result.totalCourseOutcomes,
                evaluatedOutcomesCount: result.evaluatedOutcomesCount,
                attainedOutcomesCount: result.attainedOutcomesCount,
                averageAttainment: result.averageAttainment,
                courseAttainmentStatus: result.courseAttainmentStatus,
                outcomes: result.outcomes,
            },
        });
    } catch (err) {
        if (err.statusCode) {
            res.status(err.statusCode);
        }
        next(err);
    }
};

/**
 * @desc    Update course attainment configuration settings
 * @route   PATCH /api/courses/:courseId/attainment/settings
 * @access  Private (Faculty assigned to course)
 */
const updateAttainmentSettings = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { targetPercentage, minStudentsRequired } = req.body;

        const course = await verifyCourseOwnership(courseId, req.user._id, res);

        if (targetPercentage !== undefined) {
            const parsedTarget = Number(targetPercentage);
            if (isNaN(parsedTarget) || parsedTarget < 1 || parsedTarget > 100) {
                res.status(400);
                return next(new Error('Target percentage must be between 1 and 100.'));
            }
            course.attainmentSettings.targetPercentage = parsedTarget;
        }

        if (minStudentsRequired !== undefined) {
            const parsedMin = Number(minStudentsRequired);
            if (isNaN(parsedMin) || parsedMin < 1) {
                res.status(400);
                return next(new Error('Minimum students required must be at least 1.'));
            }
            course.attainmentSettings.minStudentsRequired = parsedMin;
        }

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Attainment settings updated successfully.',
            data: course.attainmentSettings,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Calculate assessment-level CO attainment summary
 * @route   GET /api/assessments/:assessmentId/attainment
 * @access  Private (Faculty assigned to course)
 */
const getAssessmentAttainment = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
            res.status(404);
            return next(new Error('Assessment not found — invalid ID.'));
        }

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            res.status(404);
            return next(new Error('Assessment not found.'));
        }

        const course = await Course.findOne({
            _id: assessment.course,
            assignedFaculty: req.user._id,
        });

        if (!course) {
            res.status(404);
            return next(new Error('Assessment not found or course not assigned to you.'));
        }

        const targetPercentage = course.attainmentSettings?.targetPercentage || 40;

        // Fetch questions for this assessment
        const questions = await Question.find({ assessment: assessmentId, isActive: true }).populate('co');

        // Fetch enrollments
        const enrollments = await CourseEnrollment.find({ course: course._id, status: 'active' }).populate('student');
        const enrolledStudents = enrollments.filter((e) => e.student).map((e) => e.student);

        // Fetch marks for this assessment
        const marks = await StudentMark.find({ assessment: assessmentId });
        const markMap = new Map();
        marks.forEach((m) => {
            markMap.set(`${m.student.toString()}_${m.question.toString()}`, m.marksObtained);
        });

        // Unique COs in this assessment
        const coMap = new Map();
        questions.forEach((q) => {
            if (q.co) {
                const coId = q.co._id.toString();
                if (!coMap.has(coId)) {
                    coMap.set(coId, {
                        coId: q.co._id,
                        code: q.co.code,
                        description: q.co.description,
                        questions: [],
                    });
                }
                coMap.get(coId).questions.push(q);
            }
        });

        const coResults = Array.from(coMap.values()).map((item) => {
            const maxMarks = item.questions.reduce((sum, q) => sum + q.marks, 0);
            let studentsConsidered = 0;
            let studentsAttained = 0;

            enrolledStudents.forEach((student) => {
                let marksObtained = 0;
                let attemptedCount = 0;

                item.questions.forEach((q) => {
                    const key = `${student._id.toString()}_${q._id.toString()}`;
                    if (markMap.has(key)) {
                        marksObtained += markMap.get(key);
                        attemptedCount++;
                    }
                });

                if (attemptedCount > 0) {
                    studentsConsidered++;
                    const percentage = (marksObtained / maxMarks) * 100;
                    if (percentage >= targetPercentage) {
                        studentsAttained++;
                    }
                }
            });

            const attainmentPercentage =
                studentsConsidered > 0
                    ? Number(((studentsAttained / studentsConsidered) * 100).toFixed(1))
                    : null;

            return {
                coId: item.coId,
                code: item.code,
                description: item.description,
                mappedQuestionsCount: item.questions.length,
                maxMarks,
                studentsConsidered,
                studentsAttained,
                attainmentPercentage,
                status:
                    attainmentPercentage !== null
                        ? attainmentPercentage >= targetPercentage
                            ? 'Attained'
                            : 'Not Attained'
                        : 'No Marks',
            };
        });

        res.status(200).json({
            success: true,
            data: {
                assessmentId: assessment._id,
                name: assessment.name,
                targetPercentage,
                outcomes: coResults,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCourseAttainment,
    updateAttainmentSettings,
    getAssessmentAttainment,
};
