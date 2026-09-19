/**
 * Test & Verification Suite for Student Assessment Marks
 *
 * Tests all required cases:
 *  T01: Faculty can view enrolled students, questions, and marks for an assessment
 *  T02: Faculty can enter marks for an enrolled student on an assessment question
 *  T03: Faculty can update existing marks (upsert)
 *  T04: Marks = 0 works as valid boundary value
 *  T05: Marks exceeding question maximum are rejected (400 Bad Request)
 *  T06: Negative marks (< 0) are rejected (400 Bad Request)
 *  T07: Non-enrolled student cannot receive marks (400 Bad Request)
 *  T08: Question from another assessment is rejected (400 Bad Request)
 *  T09: Faculty A cannot access or enter marks for Faculty B's assessment (cross-faculty isolation, 404)
 *  T10: Duplicate mark records for { student, question } are prevented (upsert / compound unique index)
 *  T11: Batch saving of marks for multiple students and questions works
 *  T12: Unauthenticated requests are rejected (401 Unauthorized)
 *  T13: Invalid assessment, student, or question IDs are handled gracefully (404/400)
 *  T14: Student password & hash are NEVER exposed in any marks responses
 *  T15: Student course marks endpoint returns marks properly
 *
 * Usage:
 *   node scripts/testMarks.js
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
const markRoutes = require('../routes/markRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assessments/:assessmentId/marks', markRoutes);

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runMarksTests() {
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

        console.log('\n--- Setting up Realistic Test Data ---');
        const timestamp = Date.now();

        // 1. Create Faculty A and Faculty B
        const facultyA = await User.create({
            name: 'Dr. Alan Turing',
            email: `alan.turing.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Computer Science',
        });

        const facultyB = await User.create({
            name: 'Dr. Grace Hopper',
            email: `grace.hopper.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Information Technology',
        });

        // 2. Create Student A, Student B, and Student C (Unenrolled)
        const studentA = await User.create({
            name: 'Alice Cooper',
            email: `alice.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentB = await User.create({
            name: 'Bob Marley',
            email: `bob.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentC = await User.create({
            name: 'Charlie Brown (Unenrolled)',
            email: `charlie.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Electrical',
        });

        // 3. Create Course A (Faculty A) and Course B (Faculty B)
        const courseA = await Course.create({
            courseCode: `CS_MK_${timestamp}`.substring(0, 15),
            courseName: 'Algorithms & Complexity',
            department: 'Computer Science',
            semester: 4,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
        });

        const courseB = await Course.create({
            courseB: `IT_MK_${timestamp}`.substring(0, 15),
            courseCode: `IT_MK_${timestamp}`.substring(0, 15),
            courseName: 'Cloud Systems',
            department: 'Information Technology',
            semester: 5,
            credits: 3,
            academicYear: '2025-26',
            assignedFaculty: facultyB._id,
        });

        // 4. Enroll Student A and Student B in Course A
        await CourseEnrollment.create([
            { student: studentA._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
            { student: studentB._id, course: courseA._id, status: 'active', academicYear: '2025-26' },
        ]);

        // 5. Create COs for Course A
        const co1 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO1',
            description: 'Analyze time and space complexity of sorting algorithms.',
            order: 1,
        });
        const co2 = await CourseOutcome.create({
            course: courseA._id,
            code: 'CO2',
            description: 'Apply divide-and-conquer paradigm to optimization problems.',
            order: 2,
        });

        // 6. Create Assessment for Course A and Assessment for Course B
        const assessmentA = await Assessment.create({
            course: courseA._id,
            name: 'Mid-Term Exam 2026',
            type: 'Internal',
            totalMarks: 25,
            weightage: 20,
            date: new Date(),
        });

        const assessmentB = await Assessment.create({
            course: courseB._id,
            name: 'Cloud Quiz 1',
            type: 'Quiz',
            totalMarks: 20,
            weightage: 10,
            date: new Date(),
        });

        // 7. Create Questions for Assessment A
        const q1 = await Question.create({
            assessment: assessmentA._id,
            course: courseA._id,
            questionText: 'Derive the worst-case time complexity of QuickSort.',
            questionNumber: 1,
            marks: 5,
            co: co1._id,
            questionType: 'Short Answer',
        });

        const q2 = await Question.create({
            assessment: assessmentA._id,
            course: courseA._id,
            questionText: 'Implement Strassen’s matrix multiplication and explain recurrence.',
            questionNumber: 2,
            marks: 10,
            co: co2._id,
            questionType: 'Long Answer',
        });

        const q3 = await Question.create({
            assessment: assessmentA._id,
            course: courseA._id,
            questionText: 'Identify which algorithm uses greedy strategy: Dijkstra or Bellman-Ford.',
            questionNumber: 3,
            marks: 5,
            co: co1._id,
            questionType: 'MCQ',
        });

        // Create Question for Assessment B (to test foreign question rejection)
        const qForeign = await Question.create({
            assessment: assessmentB._id,
            course: courseB._id,
            questionText: 'Explain AWS S3 consistency model.',
            questionNumber: 1,
            marks: 10,
            co: co1._id, // foreign reference
            questionType: 'Short Answer',
        });

        // 8. Log in to get JWT tokens
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

        console.log('\n--- Running Student Marks Verification Tests ---\n');

        // T01: Faculty can view assessment marks data (questions, enrolled students, marks)
        const resGetMarks = await request(
            'GET',
            `/api/assessments/${assessmentA._id}/marks`,
            null,
            tokenFacultyA
        );
        assert(
            resGetMarks.status === 200 &&
            resGetMarks.data.success &&
            resGetMarks.data.data.questions.length === 3 &&
            resGetMarks.data.data.students.length === 2 &&
            resGetMarks.data.data.marks.length === 0,
            'T01: Faculty can view enrolled students and questions for assessment',
            `Status: ${resGetMarks.status}, Qs: ${resGetMarks.data.data?.questions?.length}, Students: ${resGetMarks.data.data?.students?.length}`
        );

        // T02: Faculty can enter marks for enrolled student
        const resEnterMark = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: 4,
            },
            tokenFacultyA
        );
        assert(
            resEnterMark.status === 200 &&
            resEnterMark.data.success &&
            resEnterMark.data.data[0].marksObtained === 4,
            'T02: Faculty can enter marks for enrolled student on Q1 (marks=4)',
            `Status: ${resEnterMark.status}`
        );

        // T03: Faculty can update existing marks (upsert)
        const resUpdateMark = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: 4.5,
            },
            tokenFacultyA
        );
        assert(
            resUpdateMark.status === 200 &&
            resUpdateMark.data.data[0].marksObtained === 4.5,
            'T03: Faculty can update existing marks (upsert from 4 to 4.5)',
            `Marks: ${resUpdateMark.data.data?.[0]?.marksObtained}`
        );

        // T04: Marks = 0 is accepted as valid boundary
        const resZeroMark = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentB._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: 0,
            },
            tokenFacultyA
        );
        assert(
            resZeroMark.status === 200 &&
            resZeroMark.data.data[0].marksObtained === 0,
            'T04: Marks = 0 works as valid boundary value',
            `Status: ${resZeroMark.status}`
        );

        // T05: Marks exceeding question maximum are rejected (marks=6 on 5 marks Q)
        const resExceed = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: 6,
            },
            tokenFacultyA
        );
        assert(
            resExceed.status === 400 &&
            resExceed.data.message.includes('cannot exceed maximum marks'),
            'T05: Marks exceeding question maximum are rejected (400 Bad Request)',
            `Status: ${resExceed.status}, Msg: ${resExceed.data.message}`
        );

        // T06: Negative marks (< 0) are rejected
        const resNegative = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: -1,
            },
            tokenFacultyA
        );
        assert(
            resNegative.status === 400 &&
            resNegative.data.message.includes('cannot be negative'),
            'T06: Negative marks (< 0) are rejected (400 Bad Request)',
            `Status: ${resNegative.status}, Msg: ${resNegative.data.message}`
        );

        // T07: Non-enrolled student cannot receive marks
        const resUnenrolled = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentC._id.toString(),
                questionId: q1._id.toString(),
                marksObtained: 3,
            },
            tokenFacultyA
        );
        assert(
            resUnenrolled.status === 400 &&
            resUnenrolled.data.message.includes('not enrolled'),
            'T07: Non-enrolled student cannot receive marks (400 Bad Request)',
            `Status: ${resUnenrolled.status}, Msg: ${resUnenrolled.data.message}`
        );

        // T08: Question from another assessment is rejected
        const resForeignQ = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: qForeign._id.toString(),
                marksObtained: 5,
            },
            tokenFacultyA
        );
        assert(
            resForeignQ.status === 400 &&
            resForeignQ.data.message.includes('another assessment'),
            'T08: Question from another assessment is rejected (400 Bad Request)',
            `Status: ${resForeignQ.status}, Msg: ${resForeignQ.data.message}`
        );

        // T09: Faculty A cannot access or enter marks for Faculty B's assessment
        const resCrossGet = await request(
            'GET',
            `/api/assessments/${assessmentB._id}/marks`,
            null,
            tokenFacultyA
        );
        const resCrossPost = await request(
            'POST',
            `/api/assessments/${assessmentB._id}/marks`,
            {
                studentId: studentA._id.toString(),
                questionId: qForeign._id.toString(),
                marksObtained: 5,
            },
            tokenFacultyA
        );
        assert(
            resCrossGet.status === 404 && resCrossPost.status === 404,
            'T09: Cross-faculty isolation enforced (Faculty A cannot GET or POST marks for Faculty B assessment)',
            `Get: ${resCrossGet.status}, Post: ${resCrossPost.status}`
        );

        // T10: Duplicate mark records are prevented (record count for studentA + q1 is exactly 1)
        const markRecordsCount = await StudentMark.countDocuments({
            student: studentA._id,
            question: q1._id,
        });
        assert(
            markRecordsCount === 1,
            'T10: Duplicate mark records for { student, question } are prevented (count = 1)',
            `Count: ${markRecordsCount}`
        );

        // T11: Batch saving of marks for multiple students and questions works
        const batchPayload = {
            marks: [
                { studentId: studentA._id.toString(), questionId: q2._id.toString(), marksObtained: 8 },
                { studentId: studentA._id.toString(), questionId: q3._id.toString(), marksObtained: 5 },
                { studentId: studentB._id.toString(), questionId: q2._id.toString(), marksObtained: 9 },
                { studentId: studentB._id.toString(), questionId: q3._id.toString(), marksObtained: 4 },
            ],
        };
        const resBatch = await request(
            'POST',
            `/api/assessments/${assessmentA._id}/marks`,
            batchPayload,
            tokenFacultyA
        );
        assert(
            resBatch.status === 200 &&
            resBatch.data.success &&
            resBatch.data.count === 4,
            'T11: Batch saving of marks works for multiple students and questions (count=4)',
            `Status: ${resBatch.status}, Count: ${resBatch.data.count}`
        );

        // T12: Unauthenticated requests are rejected
        const resNoAuth = await request(
            'GET',
            `/api/assessments/${assessmentA._id}/marks`,
            null,
            null
        );
        assert(
            resNoAuth.status === 401,
            'T12: Unauthenticated request is rejected with 401 Unauthorized',
            `Status: ${resNoAuth.status}`
        );

        // T13: Invalid assessment ID handled gracefully
        const resInvalidId = await request(
            'GET',
            '/api/assessments/invalidId12345/marks',
            null,
            tokenFacultyA
        );
        assert(
            resInvalidId.status === 404,
            'T13: Invalid assessment ID handled gracefully (404 Not Found)',
            `Status: ${resInvalidId.status}`
        );

        // T14: Student password & hash are NEVER exposed in any marks responses
        const resMarksCheck = await request(
            'GET',
            `/api/assessments/${assessmentA._id}/marks`,
            null,
            tokenFacultyA
        );
        const hasPasswordLeak = JSON.stringify(resMarksCheck.data).includes('password');
        assert(
            !hasPasswordLeak,
            'T14: Student password & hash are NEVER exposed in marks responses',
            `Leak: ${hasPasswordLeak}`
        );

        // T15: Student course marks endpoint returns marks properly
        const resStudentMarks = await request(
            'GET',
            `/api/courses/${courseA._id}/students/${studentA._id}/marks`,
            null,
            tokenFacultyA
        );
        assert(
            resStudentMarks.status === 200 &&
            resStudentMarks.data.success &&
            resStudentMarks.data.count === 3, // q1, q2, q3
            'T15: Student course marks endpoint returns marks properly (count=3)',
            `Status: ${resStudentMarks.status}, Count: ${resStudentMarks.data.count}`
        );

        // Cleanup test data
        console.log('\n--- Cleaning up Test Data ---');
        await StudentMark.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await Question.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await Assessment.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await CourseOutcome.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await CourseEnrollment.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await Course.deleteMany({ _id: { $in: [courseA._id, courseB._id] } });
        await User.deleteMany({ _id: { $in: [facultyA._id, facultyB._id, studentA._id, studentB._id, studentC._id] } });
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

runMarksTests();
