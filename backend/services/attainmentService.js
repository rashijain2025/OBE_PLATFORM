const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const Question = require('../models/Question');
const CourseEnrollment = require('../models/CourseEnrollment');
const StudentMark = require('../models/StudentMark');

/**
 * Helper: Verify course exists and belongs to the authenticated faculty member.
 * Throws an Error with .statusCode attached if not found or unauthorized.
 */
const verifyCourseOwnership = async (courseId, facultyId) => {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        const error = new Error('Course not found — invalid course ID.');
        error.statusCode = 404;
        throw error;
    }

    const course = await Course.findOne({
        _id: courseId,
        assignedFaculty: facultyId,
    });

    if (!course) {
        const error = new Error('Course not found or not assigned to you.');
        error.statusCode = 404;
        throw error;
    }

    return course;
};

/**
 * Core OBE Attainment Calculation Service
 * Reusable across Attainment API, Assessment Attainment, and OBE Reports.
 *
 * @param {string} courseId - Course ID
 * @param {string} facultyId - Authenticated Faculty User ID
 * @param {number|string} [targetOverride] - Optional target threshold override (1-100)
 * @returns {Promise<Object>} Calculated attainment metrics and summary
 */
const computeCourseAttainment = async (courseId, facultyId, targetOverride) => {
    // 1. Verify course ownership
    const course = await verifyCourseOwnership(courseId, facultyId);

    // 2. Determine target percentage
    let targetPercentage = 40;
    if (targetOverride !== undefined && targetOverride !== null && targetOverride !== '') {
        const parsedTarget = Number(targetOverride);
        if (isNaN(parsedTarget) || parsedTarget < 1 || parsedTarget > 100) {
            const error = new Error('Target percentage must be a number between 1 and 100.');
            error.statusCode = 400;
            throw error;
        }
        targetPercentage = parsedTarget;
    } else if (course.attainmentSettings?.targetPercentage) {
        targetPercentage = course.attainmentSettings.targetPercentage;
    }

    // 3. Fetch Course Outcomes
    const outcomes = await CourseOutcome.find({ course: courseId }).sort({ order: 1 });

    // 4. Fetch active questions mapped to COs
    const questions = await Question.find({ course: courseId, isActive: true })
        .populate('co', '_id code')
        .populate('assessment', '_id name type');

    // 5. Fetch enrolled active students
    const enrollments = await CourseEnrollment.find({
        course: courseId,
        status: 'active',
    }).populate('student', '_id name email rollNumber department isActive');

    const enrolledStudents = enrollments
        .filter((e) => e.student && e.student.isActive)
        .map((e) => e.student);

    // 6. Fetch all student marks for this course
    const marks = await StudentMark.find({ course: courseId });

    // Map marks by `${studentId}_${questionId}` -> marksObtained
    const markMap = new Map();
    marks.forEach((m) => {
        const key = `${m.student.toString()}_${m.question.toString()}`;
        markMap.set(key, m.marksObtained);
    });

    // 7. Calculate attainment per Course Outcome
    const outcomesAttainment = outcomes.map((co) => {
        const coQuestions = questions.filter(
            (q) => q.co && q.co._id.toString() === co._id.toString()
        );

        const mappedQuestionsCount = coQuestions.length;
        const maxMarks = coQuestions.reduce((sum, q) => sum + q.marks, 0);

        // Case: No questions mapped
        if (mappedQuestionsCount === 0 || maxMarks === 0) {
            return {
                coId: co._id,
                code: co.code,
                description: co.description,
                bloomLevel: co.bloomLevel || 'Understand',
                order: co.order,
                mappedQuestionsCount: 0,
                maxMarks: 0,
                studentsConsidered: 0,
                studentsAttained: 0,
                attainmentPercentage: null,
                targetPercentage,
                status: 'No Questions',
                remarks: 'No questions mapped to this Course Outcome.',
                studentsBreakdown: [],
            };
        }

        // Case: No students enrolled
        if (enrolledStudents.length === 0) {
            return {
                coId: co._id,
                code: co.code,
                description: co.description,
                bloomLevel: co.bloomLevel || 'Understand',
                order: co.order,
                mappedQuestionsCount,
                maxMarks,
                studentsConsidered: 0,
                studentsAttained: 0,
                attainmentPercentage: null,
                targetPercentage,
                status: 'No Students',
                remarks: 'No students are enrolled in this course.',
                studentsBreakdown: [],
            };
        }

        // Evaluate student performance
        const studentsBreakdown = [];
        let studentsAttainedCount = 0;

        enrolledStudents.forEach((student) => {
            let marksObtained = 0;
            let attemptedQuestionsCount = 0;

            coQuestions.forEach((q) => {
                const key = `${student._id.toString()}_${q._id.toString()}`;
                if (markMap.has(key)) {
                    marksObtained += markMap.get(key);
                    attemptedQuestionsCount++;
                }
            });

            // Consider student only if they were evaluated on at least one question in this CO
            if (attemptedQuestionsCount > 0) {
                const studentPercentage = (marksObtained / maxMarks) * 100;
                const isAttained = studentPercentage >= targetPercentage;

                if (isAttained) {
                    studentsAttainedCount++;
                }

                studentsBreakdown.push({
                    studentId: student._id,
                    name: student.name,
                    rollNumber: student.rollNumber || 'N/A',
                    email: student.email,
                    department: student.department,
                    marksObtained: Number(marksObtained.toFixed(2)),
                    maxMarks,
                    studentPercentage: Number(studentPercentage.toFixed(1)),
                    attemptedQuestions: attemptedQuestionsCount,
                    totalQuestions: mappedQuestionsCount,
                    isAttained,
                });
            }
        });

        const studentsConsidered = studentsBreakdown.length;

        // Case: Questions exist but no marks entered
        if (studentsConsidered === 0) {
            return {
                coId: co._id,
                code: co.code,
                description: co.description,
                bloomLevel: co.bloomLevel || 'Understand',
                order: co.order,
                mappedQuestionsCount,
                maxMarks,
                studentsConsidered: 0,
                studentsAttained: 0,
                attainmentPercentage: null,
                targetPercentage,
                status: 'No Marks',
                remarks: 'Questions exist but no student marks have been recorded yet.',
                studentsBreakdown: [],
            };
        }

        const attainmentPercentage = Number(
            ((studentsAttainedCount / studentsConsidered) * 100).toFixed(1)
        );

        const isCOAttained = attainmentPercentage >= targetPercentage;

        return {
            coId: co._id,
            code: co.code,
            description: co.description,
            bloomLevel: co.bloomLevel || 'Understand',
            order: co.order,
            mappedQuestionsCount,
            maxMarks,
            studentsConsidered,
            studentsAttained: studentsAttainedCount,
            attainmentPercentage,
            targetPercentage,
            status: isCOAttained ? 'Attained' : 'Not Attained',
            remarks: `${studentsAttainedCount} of ${studentsConsidered} students achieved >= ${targetPercentage}%.`,
            studentsBreakdown,
        };
    });

    // 8. Summary statistics
    const evaluatedOutcomes = outcomesAttainment.filter(
        (o) => o.attainmentPercentage !== null
    );

    const attainedOutcomes = evaluatedOutcomes.filter(
        (o) => o.status === 'Attained'
    );

    const belowTargetOutcomesList = evaluatedOutcomes.filter(
        (o) => o.status === 'Not Attained'
    );

    const averageAttainment =
        evaluatedOutcomes.length > 0
            ? Number(
                  (
                      evaluatedOutcomes.reduce(
                          (sum, o) => sum + o.attainmentPercentage,
                          0
                      ) / evaluatedOutcomes.length
                  ).toFixed(1)
              )
            : null;

    const belowTargetOutcomes = belowTargetOutcomesList.map((o) => ({
        coId: o.coId,
        code: o.code,
        description: o.description,
        bloomLevel: o.bloomLevel,
        mappedQuestionsCount: o.mappedQuestionsCount,
        maxMarks: o.maxMarks,
        studentsConsidered: o.studentsConsidered,
        studentsAttained: o.studentsAttained,
        attainmentPercentage: o.attainmentPercentage,
        targetPercentage,
        gapPercentage: Number((targetPercentage - o.attainmentPercentage).toFixed(1)),
        status: o.status,
        remarks: o.remarks,
    }));

    return {
        course,
        targetPercentage,
        totalEnrolledStudents: enrolledStudents.length,
        totalCourseOutcomes: outcomes.length,
        evaluatedOutcomesCount: evaluatedOutcomes.length,
        attainedOutcomesCount: attainedOutcomes.length,
        belowTargetOutcomesCount: belowTargetOutcomesList.length,
        averageAttainment,
        courseAttainmentStatus:
            averageAttainment !== null
                ? averageAttainment >= targetPercentage
                    ? 'Attained'
                    : 'Not Attained'
                : 'Pending Evaluation',
        outcomes: outcomesAttainment,
        belowTargetOutcomes,
    };
};

module.exports = {
    verifyCourseOwnership,
    computeCourseAttainment,
};
