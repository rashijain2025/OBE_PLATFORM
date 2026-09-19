/**
 * Test & Verification Suite for Student Enrollment in Courses
 *
 * Tests all required cases:
 *  T01: Faculty A can enroll Student A in Course A
 *  T02: Faculty A can list enrolled students and see Student A
 *  T03: Faculty A cannot manage Course B students (cross-faculty isolation)
 *  T04: Duplicate enrollment of Student A is rejected (409 Conflict)
 *  T05: Non-student user cannot be enrolled (400 Bad Request)
 *  T06: Faculty can remove enrolled student from course
 *  T07: Unauthenticated requests are rejected (401 Unauthorized)
 *  T08: Invalid course ID is handled gracefully (404/400)
 *  T09: Invalid student ID is handled gracefully (400/404)
 *  T10: Student password and password hash are NEVER exposed in any API response
 *  T11: Candidate search endpoint returns students with accurate isEnrolled flags
 *  T12: Faculty can update enrollment status (active/inactive)
 *
 * Usage:
 *   node scripts/testEnrollment.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const cors = require('cors');

const User = require('../models/User');
const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');

const authRoutes = require('../routes/authRoutes');
const courseRoutes = require('../routes/courseRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runEnrollmentTests() {
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

        console.log('\n--- Setting up Test Data ---');
        const timestamp = Date.now();

        // 1. Create Faculty A and Faculty B
        const facultyA = await User.create({
            name: 'Faculty Alpha',
            email: `faculty.alpha.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Computer Science',
        });

        const facultyB = await User.create({
            name: 'Faculty Beta',
            email: `faculty.beta.${timestamp}@test.edu`,
            password: 'password123',
            role: 'faculty',
            department: 'Information Technology',
        });

        // 2. Create Student A and Student B
        const studentA = await User.create({
            name: 'Student Alice',
            email: `student.alice.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
        });

        const studentB = await User.create({
            name: 'Student Bob',
            email: `student.bob.${timestamp}@test.edu`,
            password: 'password123',
            role: 'student',
            department: 'Information Technology',
        });

        // 3. Create Course A (Faculty A) and Course B (Faculty B)
        const courseA = await Course.create({
            courseCode: `CS_ENR_${timestamp}`.substring(0, 15),
            courseName: 'Data Structures & Algorithms',
            department: 'Computer Science',
            semester: 3,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
        });

        const courseB = await Course.create({
            courseCode: `IT_ENR_${timestamp}`.substring(0, 15),
            courseName: 'Web Engineering',
            department: 'Information Technology',
            semester: 4,
            credits: 3,
            academicYear: '2025-26',
            assignedFaculty: facultyB._id,
        });

        // 4. Log in to get JWT tokens
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

        console.log('\n--- Running Student Enrollment Verification Tests ---\n');

        // T01: Faculty A can enroll Student A in Course A
        const resEnrollA = await request(
            'POST',
            `/api/courses/${courseA._id}/students/${studentA._id}`,
            {},
            tokenFacultyA
        );
        assert(
            resEnrollA.status === 201 && resEnrollA.data.success && resEnrollA.data.data.student.name === 'Student Alice',
            'T01: Faculty A can enroll Student A in Course A',
            `Status: ${resEnrollA.status}, Body: ${JSON.stringify(resEnrollA.data)}`
        );

        // T02: Faculty A can see Student A in Course A
        const resListA = await request(
            'GET',
            `/api/courses/${courseA._id}/students`,
            null,
            tokenFacultyA
        );
        assert(
            resListA.status === 200 &&
            resListA.data.success &&
            resListA.data.data.length === 1 &&
            resListA.data.data[0].student._id.toString() === studentA._id.toString() &&
            resListA.data.data[0].status === 'active',
            'T02: Faculty A can list enrolled students and sees Student A',
            `Count: ${resListA.data.count}`
        );

        // T03: Faculty A cannot manage Course B students (cross-faculty isolation)
        const resCrossEnroll = await request(
            'POST',
            `/api/courses/${courseB._id}/students/${studentA._id}`,
            {},
            tokenFacultyA
        );
        assert(
            resCrossEnroll.status === 404,
            'T03: Faculty A cannot manage Course B students (Cross-faculty isolation rejected with 404)',
            `Status: ${resCrossEnroll.status}`
        );

        // T04: Duplicate enrollment of Student A in Course A is rejected (409)
        const resDuplicateEnroll = await request(
            'POST',
            `/api/courses/${courseA._id}/students/${studentA._id}`,
            {},
            tokenFacultyA
        );
        assert(
            resDuplicateEnroll.status === 409,
            'T04: Duplicate enrollment of Student A is rejected with 409 Conflict',
            `Status: ${resDuplicateEnroll.status}`
        );

        // T05: Non-student user cannot be enrolled (e.g. Faculty B)
        const resNonStudent = await request(
            'POST',
            `/api/courses/${courseA._id}/students/${facultyB._id}`,
            {},
            tokenFacultyA
        );
        assert(
            resNonStudent.status === 400 && resNonStudent.data.message.includes('student role'),
            'T05: Non-student user cannot be enrolled (rejected with 400)',
            `Status: ${resNonStudent.status}, Msg: ${resNonStudent.data.message}`
        );

        // T06: Status update (PATCH /api/courses/:courseId/students/:studentId/status)
        const resStatusToggle = await request(
            'PATCH',
            `/api/courses/${courseA._id}/students/${studentA._id}/status`,
            { status: 'inactive' },
            tokenFacultyA
        );
        assert(
            resStatusToggle.status === 200 && resStatusToggle.data.data.status === 'inactive',
            'T06: Faculty can update enrollment status (active -> inactive)',
            `Status: ${resStatusToggle.status}`
        );

        // T07: Candidate search returns available students with accurate isEnrolled flags
        const resSearch = await request(
            'GET',
            `/api/courses/${courseA._id}/students/search?q=Alice`,
            null,
            tokenFacultyA
        );
        const aliceCandidate = resSearch.data.data?.find((c) => c._id.toString() === studentA._id.toString());
        assert(
            resSearch.status === 200 && aliceCandidate && aliceCandidate.isEnrolled === true,
            'T07: Search candidates endpoint flags enrolled students correctly',
            `Status: ${resSearch.status}`
        );

        // T08: Faculty can remove enrolled student from course
        const resRemove = await request(
            'DELETE',
            `/api/courses/${courseA._id}/students/${studentA._id}`,
            null,
            tokenFacultyA
        );
        assert(
            resRemove.status === 200 && resRemove.data.success,
            'T08: Faculty can remove enrolled student from course (200 OK)',
            `Status: ${resRemove.status}`
        );

        // Verify list is now empty
        const resListAfterRemove = await request(
            'GET',
            `/api/courses/${courseA._id}/students`,
            null,
            tokenFacultyA
        );
        assert(
            resListAfterRemove.data.count === 0,
            'T08b: Enrolled students list is empty after removal',
            `Count: ${resListAfterRemove.data.count}`
        );

        // T09: Unauthenticated requests are rejected
        const resNoAuth = await request(
            'GET',
            `/api/courses/${courseA._id}/students`,
            null,
            null
        );
        assert(
            resNoAuth.status === 401,
            'T09: Unauthenticated request is rejected (401 Unauthorized)',
            `Status: ${resNoAuth.status}`
        );

        // T10: Invalid course ID is handled gracefully
        const resInvalidCourse = await request(
            'GET',
            '/api/courses/invalid12345/students',
            null,
            tokenFacultyA
        );
        assert(
            resInvalidCourse.status === 404,
            'T10: Invalid course ID is handled gracefully (404 Not Found)',
            `Status: ${resInvalidCourse.status}`
        );

        // T11: Invalid student ID is handled gracefully
        const resInvalidStudent = await request(
            'POST',
            `/api/courses/${courseA._id}/students/invalid-student-id`,
            {},
            tokenFacultyA
        );
        assert(
            resInvalidStudent.status === 400 || resInvalidStudent.status === 404,
            'T11: Invalid student ID is handled gracefully (400/404)',
            `Status: ${resInvalidStudent.status}`
        );

        // T12: Sensitive password / hash is NEVER exposed in any responses
        const resReEnroll = await request(
            'POST',
            `/api/courses/${courseA._id}/students/${studentB._id}`,
            {},
            tokenFacultyA
        );
        const resSearchAll = await request(
            'GET',
            `/api/courses/${courseA._id}/students/search`,
            null,
            tokenFacultyA
        );
        const resListB = await request(
            'GET',
            `/api/courses/${courseA._id}/students`,
            null,
            tokenFacultyA
        );

        const leakInEnroll = JSON.stringify(resReEnroll.data).includes('password');
        const leakInSearch = JSON.stringify(resSearchAll.data).includes('password');
        const leakInList = JSON.stringify(resListB.data).includes('password');

        assert(
            !leakInEnroll && !leakInSearch && !leakInList,
            'T12: Password & hash are NEVER returned in GET, POST, or Search responses',
            `leakEnroll: ${leakInEnroll}, leakSearch: ${leakInSearch}, leakList: ${leakInList}`
        );

        // Cleanup test data
        console.log('\n--- Cleaning up Test Data ---');
        await CourseEnrollment.deleteMany({ course: { $in: [courseA._id, courseB._id] } });
        await Course.deleteMany({ _id: { $in: [courseA._id, courseB._id] } });
        await User.deleteMany({ _id: { $in: [facultyA._id, facultyB._id, studentA._id, studentB._id] } });
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

runEnrollmentTests();
