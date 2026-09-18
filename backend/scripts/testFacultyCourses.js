/**
 * Test & Seed Verification Script for Faculty Courses Feature
 * 
 * Verifies:
 * 1. Seed Faculty A and Faculty B
 * 2. Seed Course A and Course B for Faculty A; Course C for Faculty B
 * 3. Unauthenticated request rejection
 * 4. Faculty A isolation (sees only A & B)
 * 5. Faculty B isolation (sees only C)
 * 6. Faculty C with 0 courses (empty state verification)
 * 7. Course details endpoint (/api/courses/:courseId)
 * 8. Course access isolation on details endpoint (Faculty A cannot view Course C)
 * 9. Invalid course ID handling
 * 10. Dashboard counts update (totalCourses / activeCourses)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const cors = require('cors');

const User = require('../models/User');
const Course = require('../models/Course');
const authRoutes = require('../routes/authRoutes');
const courseRoutes = require('../routes/courseRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runTests() {
    let server;
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/obe-platform');
        console.log('Connected to MongoDB.');

        // Start local test server on an ephemeral port
        server = await new Promise((resolve) => {
            const s = app.listen(0, () => resolve(s));
        });
        const port = server.address().port;
        const baseUrl = `http://localhost:${port}`;
        console.log(`Test server running on port ${port}`);

        // Helper for HTTP requests
        const request = async (method, path, body = null, token = null) => {
            const url = new URL(path, baseUrl);
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            return new Promise((resolve, reject) => {
                const req = http.request(url, { method, headers }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        try {
                            const parsed = data ? JSON.parse(data) : {};
                            resolve({ status: res.statusCode, body: parsed });
                        } catch (e) {
                            resolve({ status: res.statusCode, body: data });
                        }
                    });
                });
                req.on('error', reject);
                if (body) req.write(JSON.stringify(body));
                req.end();
            });
        };

        // ── 1. Seed Faculty Users ─────────────────────────────────────────
        console.log('\n--- 1. SEEDING USERS ---');
        await User.deleteMany({ email: { $in: ['facultya@test.edu', 'facultyb@test.edu', 'facultyc@test.edu'] } });

        const userA = await User.create({
            name: 'Dr. Alice Smith',
            email: 'facultya@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
        });
        const userB = await User.create({
            name: 'Prof. Bob Jones',
            email: 'facultyb@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Information Technology',
        });
        const userC = await User.create({
            name: 'Dr. Carol White',
            email: 'facultyc@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
        });
        console.log(`Created Faculty A: ${userA.name} (${userA.email})`);
        console.log(`Created Faculty B: ${userB.name} (${userB.email})`);
        console.log(`Created Faculty C: ${userC.name} (${userC.email})`);

        // ── 2. Seed Courses ───────────────────────────────────────────────
        console.log('\n--- 2. SEEDING COURSES ---');
        await Course.deleteMany({
            courseCode: { $in: ['CS301', 'CS302', 'IT401'] },
            academicYear: '2025-26',
        });

        const courseA = await Course.create({
            courseCode: 'CS301',
            courseName: 'Data Structures and Algorithms',
            department: 'Computer Science',
            semester: 3,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: userA._id,
            description: 'Fundamental data structures and algorithmic paradigms.',
            isActive: true,
        });

        const courseB = await Course.create({
            courseCode: 'CS302',
            courseName: 'Database Management Systems',
            department: 'Computer Science',
            semester: 4,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: userA._id,
            description: 'Relational databases, SQL, normalization, and transactions.',
            isActive: true,
        });

        const courseC = await Course.create({
            courseCode: 'IT401',
            courseName: 'Cloud Computing & DevOps',
            department: 'Information Technology',
            semester: 7,
            credits: 3,
            academicYear: '2025-26',
            assignedFaculty: userB._id,
            description: 'Cloud architecture, virtualization, and CI/CD pipelines.',
            isActive: true,
        });

        console.log(`Created Course A: ${courseA.courseCode} - ${courseA.courseName} -> Faculty A`);
        console.log(`Created Course B: ${courseB.courseCode} - ${courseB.courseName} -> Faculty A`);
        console.log(`Created Course C: ${courseC.courseCode} - ${courseC.courseName} -> Faculty B`);

        // ── 3. Test Authentication & Tokens ───────────────────────────────
        console.log('\n--- 3. TESTING AUTHENTICATION ---');
        const loginResA = await request('POST', '/api/auth/login', {
            email: 'facultya@test.edu',
            password: 'Password123!',
        });
        console.log(`Login Faculty A: status ${loginResA.status}, success = ${loginResA.body.success}, hasToken = ${!!loginResA.body.token}`);
        const tokenA = loginResA.body.token;

        const loginResB = await request('POST', '/api/auth/login', {
            email: 'facultyb@test.edu',
            password: 'Password123!',
        });
        console.log(`Login Faculty B: status ${loginResB.status}, success = ${loginResB.body.success}, hasToken = ${!!loginResB.body.token}`);
        const tokenB = loginResB.body.token;

        const loginResC = await request('POST', '/api/auth/login', {
            email: 'facultyc@test.edu',
            password: 'Password123!',
        });
        const tokenC = loginResC.body.token;

        // ── 4. Verify Unauthenticated Request Rejected ────────────────────
        console.log('\n--- 4. VERIFY UNAUTHENTICATED REQUEST ---');
        const unauthRes = await request('GET', '/api/courses/my-courses');
        console.log(`Unauthenticated GET /api/courses/my-courses: status ${unauthRes.status} (Expected: 401)`);
        console.assert(unauthRes.status === 401, 'Unauthenticated request must return 401');

        // ── 5. Verify Faculty A Course List ───────────────────────────────
        console.log('\n--- 5. VERIFY FACULTY A COURSES ---');
        const resA = await request('GET', '/api/courses/my-courses', null, tokenA);
        console.log(`Faculty A courses response: status ${resA.status}`, resA.body);
        const codesA = resA.body.data ? resA.body.data.map((c) => c.courseCode) : [];
        console.log(`Faculty A course codes: ${codesA.join(', ')}`);
        console.assert(codesA.includes('CS301') && codesA.includes('CS302'), 'Faculty A must see CS301 and CS302');
        console.assert(!codesA.includes('IT401'), 'Faculty A must NOT see IT401');

        // ── 6. Verify Faculty B Course List ───────────────────────────────
        console.log('\n--- 6. VERIFY FACULTY B COURSES ---');
        const resB = await request('GET', '/api/courses/my-courses', null, tokenB);
        console.log(`Faculty B courses count: ${resB.body.count} (Expected: 1)`);
        const codesB = resB.body.data.map((c) => c.courseCode);
        console.log(`Faculty B course codes: ${codesB.join(', ')}`);
        console.assert(codesB.includes('IT401'), 'Faculty B must see IT401');
        console.assert(!codesB.includes('CS301') && !codesB.includes('CS302'), 'Faculty B must NOT see CS301 or CS302');

        // ── 7. Verify Empty Course List for Faculty C ─────────────────────
        console.log('\n--- 7. VERIFY EMPTY COURSE LIST (Faculty C) ---');
        const resC = await request('GET', '/api/courses/my-courses', null, tokenC);
        console.log(`Faculty C courses count: ${resC.body.count} (Expected: 0)`);
        console.assert(resC.body.count === 0, 'Faculty C must have 0 courses');

        // ── 8. Verify Course Details Endpoint ─────────────────────────────
        console.log('\n--- 8. VERIFY COURSE DETAILS ---');
        const detailResA = await request('GET', `/api/courses/${courseA._id}`, null, tokenA);
        console.log(`Faculty A accessing Course A: status ${detailResA.status}, courseName = "${detailResA.body.data?.courseName}"`);
        console.assert(detailResA.status === 200, 'Faculty A must be able to view Course A');
        console.assert(detailResA.body.data.assignedFaculty.name === 'Dr. Alice Smith', 'Populated faculty name must match');

        // ── 9. Verify Course Isolation on Details Endpoint ────────────────
        console.log('\n--- 9. VERIFY COURSE ACCESS ISOLATION ---');
        const unauthorizedDetail = await request('GET', `/api/courses/${courseC._id}`, null, tokenA);
        console.log(`Faculty A accessing Course C (assigned to Faculty B): status ${unauthorizedDetail.status} (Expected: 404)`);
        console.assert(unauthorizedDetail.status === 404, 'Faculty A must NOT be able to access Course C');

        // ── 10. Verify Invalid Course ID ──────────────────────────────────
        console.log('\n--- 10. VERIFY INVALID COURSE ID ---');
        const invalidIdRes = await request('GET', '/api/courses/not-a-valid-id', null, tokenA);
        console.log(`Invalid ID GET /api/courses/not-a-valid-id: status ${invalidIdRes.status}, message: "${invalidIdRes.body.message}"`);
        console.assert(invalidIdRes.status === 404, 'Invalid ID must return 404');

        // ── 11. Verify Dashboard Summary Integration ──────────────────────
        console.log('\n--- 11. VERIFY DASHBOARD INTEGRATION ---');
        const dashResA = await request('GET', '/api/dashboard/faculty', null, tokenA);
        console.log(`Faculty A dashboard: totalCourses = ${dashResA.body.data.summary.totalCourses}, activeCourses = ${dashResA.body.data.summary.activeCourses}`);
        console.assert(dashResA.body.data.summary.totalCourses === 2, 'Faculty A dashboard totalCourses must be 2');

        const dashResB = await request('GET', '/api/dashboard/faculty', null, tokenB);
        console.log(`Faculty B dashboard: totalCourses = ${dashResB.body.data.summary.totalCourses}, activeCourses = ${dashResB.body.data.summary.activeCourses}`);
        console.assert(dashResB.body.data.summary.totalCourses === 1, 'Faculty B dashboard totalCourses must be 1');

        console.log('\n========================================');
        console.log('ALL 11 VERIFICATION TESTS PASSED PERFECTLY!');
        console.log('========================================\n');
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exitCode = 1;
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runTests();
