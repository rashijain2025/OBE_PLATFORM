/**
 * Test & Verification Suite for Course Outcome (CO) Attainment Calculation
 *
 * Tests all required cases:
 *  T01: Correct basic CO attainment calculation (4 students, 3 attained = 75%)
 *  T02: Configurable target percentage works on-the-fly via query param (target=65% -> 25%)
 *  T03: Student exactly at target threshold (40%) is considered attained (>=)
 *  T04: Student below target threshold (30%) is considered not attained (<)
 *  T05: Multiple questions mapped to same CO correctly sum max marks and student scores
 *  T06: Multiple assessments contributing questions to the same CO aggregate correctly
 *  T07: Explicit zero marks (0/10) is included in considered students; unattempted student is excluded
 *  T08: CO with no mapped questions returns status="No Questions" and attainmentPercentage=null
 *  T09: CO with questions but no marks returns status="No Marks" and attainmentPercentage=null
 *  T10: Course with no enrolled students returns status="No Students" and attainmentPercentage=null
 *  T11: Faculty can update course target percentage via PATCH /attainment/settings
 *  T12: Faculty A cannot access Course B attainment (cross-faculty isolation rejected with 404)
 *  T13: Unauthenticated request is rejected with 401 Unauthorized
 *  T14: Invalid course ID is handled gracefully with 404/400
 *  T15: Assessment-level attainment endpoint returns accurate localized attainment
 *
 * Usage:
 *   node scripts/testAttainment.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const cors = require('cors');

const User = require('../models/User');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const CourseEnrollment = require('../models/CourseEnrollment');
const StudentMark = require('../models/StudentMark');

const authRoutes = require('../routes/authRoutes');
const courseRoutes = require('../routes/courseRoutes');
const assessmentRoutes = require('../routes/assessmentRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments', assessmentRoutes);

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runAttainmentTests() {
    let server;
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/obe-platform');
        console.log('Connected to MongoDB.');

        server = await new Promise((resolve) => {
            const s = app.listen(0, () => resolve(s));
        });
        const port = server.address().port;
        const baseUrl = `http://localhost:${port}`;
        console.log(`Test server running on port ${port}`);

        const request = async (method, path, body = null, token = null) => {
            const url = new URL(path, baseUrl);
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            return new Promise((resolve, reject) => {
                const options = {
                    hostname: url.hostname,
                    port: url.port,
                    path: url.pathname + url.search,
                    method,
                    headers,
                };

                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            resolve({ status: res.statusCode, data: JSON.parse(data) });
                        } catch {
                            resolve({ status: res.statusCode, data: {} });
                        }
                    });
                });

                req.on('error', reject);
                if (body) req.write(JSON.stringify(body));
                req.end();
            });
        };

        let passed = 0;
        let failed = 0;
        const results = [];

        function assert(condition, testName, details = '') {
            if (condition) {
                passed++;
                results.push(`  ✅ PASS: ${testName}`);
            } else {
                failed++;
                results.push(`  ❌ FAIL: ${testName}${details ? ` (${details})` : ''}`);
            }
        }

        console.log('\n--- Setting up Deterministic Test Data ---');
        const timestamp = Date.now();

        // 1. Create Faculty A and Faculty B
        const facultyA = await User.create({
            name: 'Dr. John von Neumann',
            email: `vonneumann.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Computer Science',
        });

        const facultyB = await User.create({
            name: 'Dr. Claude Shannon',
            email: `shannon.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Information Theory',
        });

        // 2. Create Students A, B, C, D, E (Unenrolled / Unattempted)
        const studentA = await User.create({
            name: 'Student A',
            email: `student.a.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentB = await User.create({
            name: 'Student B',
            email: `student.b.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentC = await User.create({
            name: 'Student C',
            email: `student.c.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentD = await User.create({
            name: 'Student D',
            email: `student.d.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentE = await User.create({
            name: 'Student E (Unattempted)',
            email: `student.e.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        // 3. Create Course A (Faculty A) and Course B (Faculty B)
        const courseA = await Course.create({
            courseCode: `CS_ATT_${timestamp}`.substring(0, 15),
            courseName: 'Computation Theory',
            department: 'Computer Science',
            semester: 5,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
            attainmentSettings: { targetPercentage: 40, minStudentsRequired: 1 },
        });

        const courseB = await Course.create({
            courseCode: `IT_ATT_${timestamp}`.substring(0, 15),
            courseName: 'Information Systems',
            department: 'Information Theory',
            semester: 6,
            credits: 3,
            academicYear: '2025-26',
            assignedFaculty: facultyB._id,
        });

        // Course C: No enrolled students
        const courseC = await Course.create({
            courseCode: `CS_EMPTY_${timestamp}`.substring(0, 15),
            courseName: 'Empty Course',
            department: 'Computer Science',
            semester: 1,
            credits: 3,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
        });

        // 4. Enroll Students A, B, C, D, E in Course A
        await CourseEnrollment.create([
            { student: studentA._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
            { student: studentB._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
            { student: studentC._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
            { student: studentD._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
            { student: studentE._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
        ]);

        // 5. Create Course Outcomes for Course A:
        // CO1: Mapped to Q1 (5M) and Q2 (5M) -> Total Max = 10M
        const co1 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO1',
            description: 'Understand deterministic finite automata and regular languages.',
            order: 1,
        });

        // CO2: Mapped across two assessments! Mid-Term Q3 (10M) and Final Exam Q4 (10M) -> Total Max = 20M
        const co2 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO2',
            description: 'Design context-free grammars and pushdown automata.',
            order: 2,
        });

        // CO3: Has questions but NO marks entered
        const co3 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO3',
            description: 'Analyze Turing machines and decidability.',
            order: 3,
        });

        // CO4: No questions mapped
        const co4 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO4',
            description: 'Demonstrate NP-completeness and polynomial reductions.',
            order: 4,
        });

        // 6. Create Assessments: Assessment 1 (Mid-Term) and Assessment 2 (Final Exam)
        const assess1 = await Assessment.create({
            course: courseA._id,
            name: 'Mid-Term Exam',
            type: 'Internal',
            totalMarks: 20,
            date: new Date(),
        });

        const assess2 = await Assessment.create({
            course: courseA._id,
            name: 'Final Exam',
            type: 'Final Exam',
            totalMarks: 30,
            date: new Date(),
        });

        // 7. Create Questions:
        // Q1 (5M) -> CO1 (Mid-Term)
        const q1 = await Question.create({
            assessment: assess1._id,
            course: courseA._id,
            questionNumber: 1,
            questionText: 'Construct a DFA for strings ending in 01.',
            marks: 5,
            co: co1._id,
        });

        // Q2 (5M) -> CO1 (Mid-Term)
        const q2 = await Question.create({
            assessment: assess1._id,
            course: courseA._id,
            questionNumber: 2,
            questionText: 'State and prove the Pumping Lemma for regular languages.',
            marks: 5,
            co: co1._id,
        });

        // Q3 (10M) -> CO2 (Mid-Term)
        const q3 = await Question.create({
            assessment: assess1._id,
            course: courseA._id,
            questionNumber: 3,
            questionText: 'Design a PDA accepting equal number of 0s and 1s.',
            marks: 10,
            co: co2._id,
        });

        // Q4 (10M) -> CO2 (Final Exam — tests multiple assessments contributing to same CO)
        const q4 = await Question.create({
            assessment: assess2._id,
            course: courseA._id,
            questionNumber: 1,
            questionText: 'Convert CFG into Chomsky Normal Form.',
            marks: 10,
            co: co2._id,
        });

        // Q5 (10M) -> CO3 (Has question, but we will enter NO marks for this question)
        const q5 = await Question.create({
            assessment: assess2._id,
            course: courseA._id,
            questionNumber: 2,
            questionText: 'Describe Universal Turing Machine architecture.',
            marks: 10,
            co: co3._id,
        });

        // 8. Create Student Marks for CO1:
        // Target = 40% (4 / 10 marks needed)
        // Student A: Q1=4, Q2=4 -> 8/10 = 80% (Attained ✅)
        // Student B: Q1=3, Q2=3 -> 6/10 = 60% (Attained ✅)
        // Student C: Q1=1, Q2=2 -> 3/10 = 30% (Not Attained ❌)
        // Student D: Q1=2, Q2=2 -> 4/10 = 40% (Exactly at target! Attained ✅)
        // Student E: NO marks entered (Unattempted) -> Must be excluded from studentsConsidered!
        await StudentMark.create([
            { student: studentA._id, course: courseA._id, assessment: assess1._id, question: q1._id, marksObtained: 4, evaluatedBy: facultyA._id },
            { student: studentA._id, course: courseA._id, assessment: assess1._id, question: q2._id, marksObtained: 4, evaluatedBy: facultyA._id },

            { student: studentB._id, course: courseA._id, assessment: assess1._id, question: q1._id, marksObtained: 3, evaluatedBy: facultyA._id },
            { student: studentB._id, course: courseA._id, assessment: assess1._id, question: q2._id, marksObtained: 3, evaluatedBy: facultyA._id },

            { student: studentC._id, course: courseA._id, assessment: assess1._id, question: q1._id, marksObtained: 1, evaluatedBy: facultyA._id },
            { student: studentC._id, course: courseA._id, assessment: assess1._id, question: q2._id, marksObtained: 2, evaluatedBy: facultyA._id },

            { student: studentD._id, course: courseA._id, assessment: assess1._id, question: q1._id, marksObtained: 2, evaluatedBy: facultyA._id },
            { student: studentD._id, course: courseA._id, assessment: assess1._id, question: q2._id, marksObtained: 2, evaluatedBy: facultyA._id },
        ]);

        // Marks for CO2 (cross-assessment: assess1.q3 [10M] + assess2.q4 [10M] = 20M max):
        // Student A: Q3=8, Q4=9 -> 17/20 = 85% (Attained ✅)
        // Student B: Q3=3, Q4=3 -> 6/20 = 30% (Not Attained ❌)
        // Student C: Q3=0, Q4=0 -> 0/20 = 0% (Explicit 0 marks: Considered, but Not Attained ❌)
        await StudentMark.create([
            { student: studentA._id, course: courseA._id, assessment: assess1._id, question: q3._id, marksObtained: 8, evaluatedBy: facultyA._id },
            { student: studentA._id, course: courseA._id, assessment: assess2._id, question: q4._id, marksObtained: 9, evaluatedBy: facultyA._id },

            { student: studentB._id, course: courseA._id, assessment: assess1._id, question: q3._id, marksObtained: 3, evaluatedBy: facultyA._id },
            { student: studentB._id, course: courseA._id, assessment: assess2._id, question: q4._id, marksObtained: 3, evaluatedBy: facultyA._id },

            { student: studentC._id, course: courseA._id, assessment: assess1._id, question: q3._id, marksObtained: 0, evaluatedBy: facultyA._id },
            { student: studentC._id, course: courseA._id, assessment: assess2._id, question: q4._id, marksObtained: 0, evaluatedBy: facultyA._id },
        ]);

        // 9. Obtain JWT tokens
        const loginFacultyA = await request('POST', '/api/auth/login', {
            email: facultyA.email,
            password: 'password123',
        });
        const tokenFacultyA = loginFacultyA.data.token;

        const loginFacultyB = await request('POST', '/api/auth/login', {
            email: facultyB.email,
            password: 'password123',
        });
        const tokenFacultyB = loginFacultyB.data.token;

        console.log('Faculty A token acquired:', !!tokenFacultyA);
        console.log('Faculty B token acquired:', !!tokenFacultyB);

        console.log('\n--- Running CO Attainment Verification Tests ---\n');

        // T01: Correct basic calculation for CO1
        const resCOAttainment = await request(
            'GET',
            `/api/courses/${courseA._id}/attainment`,
            null,
            tokenFacultyA
        );
        const dataCO = resCOAttainment.data.data;
        const co1Result = dataCO?.outcomes?.find((o) => o.code === 'CO1');

        assert(
            resCOAttainment.status === 200 &&
            co1Result &&
            co1Result.mappedQuestionsCount === 2 &&
            co1Result.maxMarks === 10 &&
            co1Result.studentsConsidered === 4 &&
            co1Result.studentsAttained === 3 &&
            co1Result.attainmentPercentage === 75 &&
            co1Result.status === 'Attained',
            'T01: Correct basic CO attainment calculation (CO1: 4 considered, 3 attained = 75.0%)',
            `Status: ${co1Result?.status}, Attainment: ${co1Result?.attainmentPercentage}%, Attained: ${co1Result?.studentsAttained}/${co1Result?.studentsConsidered}`
        );

        // T02: Configurable target percentage works via query param (?target=65)
        // At 65%: Student A (80%) attained, Student B (60%), C (30%), D (40%) not attained -> 1/4 = 25%
        const resTarget65 = await request(
            'GET',
            `/api/courses/${courseA._id}/attainment?target=65`,
            null,
            tokenFacultyA
        );
        const co1Target65 = resTarget65.data.data?.outcomes?.find((o) => o.code === 'CO1');
        assert(
            resTarget65.status === 200 &&
            resTarget65.data.data.targetPercentage === 65 &&
            co1Target65.studentsAttained === 1 &&
            co1Target65.attainmentPercentage === 25 &&
            co1Target65.status === 'Not Attained',
            'T02: Configurable target percentage via query param works (?target=65 -> 25.0% Not Attained)',
            `Target: ${resTarget65.data.data?.targetPercentage}, Attained: ${co1Target65?.studentsAttained}, %: ${co1Target65?.attainmentPercentage}`
        );

        // T03: Student D exactly at target (40%) is considered attained
        const studentDResult = co1Result?.studentsBreakdown?.find((s) => s.studentId.toString() === studentD._id.toString());
        assert(
            studentDResult && studentDResult.studentPercentage === 40 && studentDResult.isAttained === true,
            'T03: Student scoring exactly at target (40.0%) is counted as Attained (>=)',
            `Student D score: ${studentDResult?.studentPercentage}%, isAttained: ${studentDResult?.isAttained}`
        );

        // T04: Student C below target (30%) is considered not attained
        const studentCResult = co1Result?.studentsBreakdown?.find((s) => s.studentId.toString() === studentC._id.toString());
        assert(
            studentCResult && studentCResult.studentPercentage === 30 && studentCResult.isAttained === false,
            'T04: Student scoring below target (30.0%) is counted as Not Attained (<)',
            `Student C score: ${studentCResult?.studentPercentage}%, isAttained: ${studentCResult?.isAttained}`
        );

        // T05: Multiple questions mapped to same CO (Q1=5M + Q2=5M = 10M)
        assert(
            co1Result.mappedQuestionsCount === 2 && co1Result.maxMarks === 10,
            'T05: Multiple questions mapped to same CO sum maximum marks accurately (5M + 5M = 10M)',
            `Count: ${co1Result.mappedQuestionsCount}, MaxMarks: ${co1Result.maxMarks}`
        );

        // T06: Multiple assessments contributing questions to the same CO aggregate correctly (CO2: assess1.q3 + assess2.q4)
        const co2Result = dataCO?.outcomes?.find((o) => o.code === 'CO2');
        assert(
            co2Result &&
            co2Result.mappedQuestionsCount === 2 &&
            co2Result.maxMarks === 20 &&
            co2Result.studentsConsidered === 3 &&
            co2Result.studentsAttained === 1 &&
            co2Result.attainmentPercentage === 33.3,
            'T06: Cross-assessment questions contributing to same CO aggregate accurately (CO2 max=20M, 1/3 attained = 33.3%)',
            `MaxMarks: ${co2Result?.maxMarks}, Attained: ${co2Result?.studentsAttained}/${co2Result?.studentsConsidered}, %: ${co2Result?.attainmentPercentage}`
        );

        // T07: Explicit zero marks (0/20) is included in considered students; unattempted student E is excluded
        const studentCInCO2 = co2Result?.studentsBreakdown?.find((s) => s.studentId.toString() === studentC._id.toString());
        const studentEInCO1 = co1Result?.studentsBreakdown?.find((s) => s.studentId.toString() === studentE._id.toString());
        assert(
            studentCInCO2 && studentCInCO2.marksObtained === 0 && studentCInCO2.isAttained === false && !studentEInCO1,
            'T07: Explicit 0 marks (Student C: 0/20) is counted in considered students; unattempted student E is excluded',
            `Student C in CO2: ${!!studentCInCO2}, Student E in CO1: ${!!studentEInCO1}`
        );

        // T08: CO with no mapped questions returns status="No Questions" and attainmentPercentage=null
        const co4Result = dataCO?.outcomes?.find((o) => o.code === 'CO4');
        assert(
            co4Result &&
            co4Result.mappedQuestionsCount === 0 &&
            co4Result.attainmentPercentage === null &&
            co4Result.status === 'No Questions',
            'T08: CO with no mapped questions returns status="No Questions" and attainmentPercentage=null',
            `Status: ${co4Result?.status}, %: ${co4Result?.attainmentPercentage}`
        );

        // T09: CO with questions but no marks returns status="No Marks" and attainmentPercentage=null
        const co3Result = dataCO?.outcomes?.find((o) => o.code === 'CO3');
        assert(
            co3Result &&
            co3Result.mappedQuestionsCount === 1 &&
            co3Result.studentsConsidered === 0 &&
            co3Result.attainmentPercentage === null &&
            co3Result.status === 'No Marks',
            'T09: CO with questions but no marks returns status="No Marks" and attainmentPercentage=null',
            `Status: ${co3Result?.status}, %: ${co3Result?.attainmentPercentage}`
        );

        // T10: Course with no enrolled students returns status="No Students" and attainmentPercentage=null
        const resEmptyCourse = await request(
            'GET',
            `/api/courses/${courseC._id}/attainment`,
            null,
            tokenFacultyA
        );
        assert(
            resEmptyCourse.status === 200 &&
            resEmptyCourse.data.data.totalEnrolledStudents === 0 &&
            resEmptyCourse.data.data.averageAttainment === null,
            'T10: Course with no enrolled students handled gracefully (totalEnrolled=0, averageAttainment=null)',
            `TotalEnrolled: ${resEmptyCourse.data.data?.totalEnrolledStudents}`
        );

        // T11: Faculty can update course default target percentage via PATCH /attainment/settings
        const resUpdateSettings = await request(
            'PATCH',
            `/api/courses/${courseA._id}/attainment/settings`,
            { targetPercentage: 50 },
            tokenFacultyA
        );
        const resCheckUpdated = await request(
            'GET',
            `/api/courses/${courseA._id}/attainment`,
            null,
            tokenFacultyA
        );
        assert(
            resUpdateSettings.status === 200 &&
            resCheckUpdated.data.data.targetPercentage === 50,
            'T11: Faculty can update course default target percentage via PATCH /attainment/settings (50%)',
            `Target: ${resCheckUpdated.data.data?.targetPercentage}%`
        );

        // T12: Faculty A cannot access Course B attainment (cross-faculty isolation rejected with 404)
        const resCrossAccess = await request(
            'GET',
            `/api/courses/${courseB._id}/attainment`,
            null,
            tokenFacultyA
        );
        assert(
            resCrossAccess.status === 404,
            'T12: Cross-faculty isolation enforced (Faculty A cannot access Course B attainment, rejected with 404)',
            `Status: ${resCrossAccess.status}`
        );

        // T13: Unauthenticated request is rejected with 401 Unauthorized
        const resNoAuth = await request(
            'GET',
            `/api/courses/${courseA._id}/attainment`,
            null,
            null
        );
        assert(
            resNoAuth.status === 401,
            'T13: Unauthenticated request is rejected with 401 Unauthorized',
            `Status: ${resNoAuth.status}`
        );

        // T14: Invalid course ID is handled gracefully with 404/400
        const resInvalidCourse = await request(
            'GET',
            '/api/courses/invalidId12345/attainment',
            null,
            tokenFacultyA
        );
        assert(
            resInvalidCourse.status === 404,
            'T14: Invalid course ID is handled gracefully with 404 Not Found',
            `Status: ${resInvalidCourse.status}`
        );

        // T15: Assessment-level attainment endpoint returns accurate localized attainment
        const resAssessmentAttain = await request(
            'GET',
            `/api/assessments/${assess1._id}/attainment`,
            null,
            tokenFacultyA
        );
        const assessCO1 = resAssessmentAttain.data.data?.outcomes?.find((o) => o.code === 'CO1');
        assert(
            resAssessmentAttain.status === 200 &&
            resAssessmentAttain.data.success &&
            assessCO1 &&
            assessCO1.studentsConsidered === 4 &&
            assessCO1.attainmentPercentage === 50, // With target=50% from T11: Student A (80%), B (60%) attained; C (30%), D (40%) not attained -> 2/4 = 50%
            'T15: Assessment-level attainment endpoint returns accurate localized attainment',
            `Status: ${resAssessmentAttain.status}, Attainment: ${assessCO1?.attainmentPercentage}%`
        );

        // Cleanup test data
        console.log('\n--- Cleaning up Test Data ---');
        await StudentMark.deleteMany({ course: { $in: [courseA._id, courseB._id, courseC._id] } });
        await Question.deleteMany({ course: { $in: [courseA._id, courseB._id, courseC._id] } });
        await Assessment.deleteMany({ course: { $in: [courseA._id, courseB._id, courseC._id] } });
        await CourseOutcome.deleteMany({ course: { $in: [courseA._id, courseB._id, courseC._id] } });
        await CourseEnrollment.deleteMany({ course: { $in: [courseA._id, courseB._id, courseC._id] } });
        await Course.deleteMany({ _id: { $in: [courseA._id, courseB._id, courseC._id] } });
        await User.deleteMany({ _id: { $in: [facultyA._id, facultyB._id, studentA._id, studentB._id, studentC._id, studentD._id, studentE._id] } });
        console.log('Test data cleaned up.');

        // Print results summary
        console.log('\n==================================================');
        console.log('TEST RESULTS SUMMARY:');
        console.log('==================================================');
        results.forEach((r) => console.log(r));
        console.log('==================================================');
        console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log('==================================================\n');

        if (failed > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error('Test execution error:', err);
        process.exit(1);
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runAttainmentTests();
