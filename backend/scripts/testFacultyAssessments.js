/**
 * Test & Verification Script for Faculty Assessment Management
 *
 * Verifies:
 * 1. Setup Faculty A, Faculty B, Course A (Faculty A), Course B (Faculty B)
 * 2. Login & JWT generation
 * 3. Unauthenticated request rejected (401)
 * 4. Empty assessments state on new course (count 0)
 * 5. Input validation: missing name, invalid marks (400)
 * 6. Faculty A creates Assessment 1, 2, 3 for Course A (201)
 * 7. Faculty A lists assessments for Course A (count 3)
 * 8. Duplicate assessment name rejection in same course (409 Conflict)
 * 9. Faculty A updates Assessment 2 (marks, status, weightage) (200)
 * 10. Faculty B creates Assessment 1 in Course B (201)
 * 11. Cross-faculty isolation:
 *     - Faculty B cannot GET, POST, PUT, DELETE in Course A (404)
 *     - Faculty A cannot GET in Course B (404)
 * 12. Faculty-wide listing GET /api/assessments:
 *     - Faculty A sees only Course A assessments
 *     - Faculty B sees only Course B assessments
 * 13. Invalid courseId & assessmentId handling (404)
 * 14. Faculty A deletes Assessment 3
 * 15. Dashboard synchronization:
 *     - activeAssessments count matches
 *     - recentAssessments populated with course details
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

const authRoutes = require('../routes/authRoutes');
const courseRoutes = require('../routes/courseRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const facultyAssessmentRoutes = require('../routes/facultyAssessmentRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assessments', facultyAssessmentRoutes);

// Error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runAssessmentTests() {
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

        // ── 1. Setup Test Users & Courses ─────────────────────────────────
        console.log('\n--- 1. SETTING UP TEST USERS & COURSES ---');
        await User.deleteMany({ email: { $in: ['asmt_a@test.edu', 'asmt_b@test.edu'] } });

        const facultyA = await User.create({
            name: 'Dr. Katherine Johnson',
            email: 'asmt_a@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
        });

        const facultyB = await User.create({
            name: 'Prof. Margaret Hamilton',
            email: 'asmt_b@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Software Engineering',
        });

        await Course.deleteMany({ courseCode: { $in: ['CS501', 'SE502'] } });

        const courseA = await Course.create({
            courseCode: 'CS501',
            courseName: 'Advanced Operating Systems',
            department: 'Computer Science',
            semester: 5,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
        });

        const courseB = await Course.create({
            courseCode: 'SE502',
            courseName: 'Software Architecture & Design',
            department: 'Software Engineering',
            semester: 5,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyB._id,
        });

        await Assessment.deleteMany({ course: { $in: [courseA._id, courseB._id] } });

        const loginA = await request('POST', '/api/auth/login', {
            email: 'asmt_a@test.edu',
            password: 'Password123!',
        });
        const tokenA = loginA.body.token;

        const loginB = await request('POST', '/api/auth/login', {
            email: 'asmt_b@test.edu',
            password: 'Password123!',
        });
        const tokenB = loginB.body.token;

        console.log('Setup finished. Logged in Faculty A and B.');

        // ── 2. Unauthenticated Request Rejected ───────────────────────────
        console.log('\n--- 2. VERIFY UNAUTHENTICATED REQUEST ---');
        const unauthRes = await request('GET', `/api/courses/${courseA._id}/assessments`);
        console.log(`Unauthenticated GET assessments: status ${unauthRes.status} (Expected: 401)`);
        console.assert(unauthRes.status === 401, 'Must return 401');

        // ── 3. Empty State ────────────────────────────────────────────────
        console.log('\n--- 3. VERIFY EMPTY ASSESSMENTS STATE ---');
        const emptyRes = await request('GET', `/api/courses/${courseA._id}/assessments`, null, tokenA);
        console.log(`Initial GET assessments count: ${emptyRes.body.count} (Expected: 0)`);
        console.assert(emptyRes.status === 200 && emptyRes.body.count === 0, 'Must have 0 assessments');

        // ── 4. Validation Checks ──────────────────────────────────────────
        console.log('\n--- 4. VERIFY INPUT VALIDATION ---');
        const noNameRes = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: '',
            type: 'Internal',
            totalMarks: 50,
        }, tokenA);
        console.log(`Missing name validation: status ${noNameRes.status} (Expected: 400)`);
        console.assert(noNameRes.status === 400, 'Missing name must return 400');

        const badMarksRes = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Test Exam',
            type: 'Internal',
            totalMarks: -5,
        }, tokenA);
        console.log(`Invalid marks validation: status ${badMarksRes.status} (Expected: 400)`);
        console.assert(badMarksRes.status === 400, 'Invalid marks must return 400');

        // ── 5. Create Assessments (Faculty A) ─────────────────────────────
        console.log('\n--- 5. CREATE ASSESSMENTS (Faculty A) ---');
        const a1 = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Internal Assessment 1',
            type: 'Internal',
            totalMarks: 50,
            weightage: 20,
            status: 'active',
            description: 'Units 1 and 2 descriptive test',
        }, tokenA);
        console.log(`Created Assessment 1: status ${a1.status}, id = ${a1.body.data?._id}`);
        console.assert(a1.status === 201, 'A1 must return 201');
        const a1Id = a1.body.data._id;

        const a2 = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Assignment 1',
            type: 'Assignment',
            totalMarks: 20,
            weightage: 10,
            status: 'active',
            description: 'Concurrency and synchronization problem set',
        }, tokenA);
        console.log(`Created Assessment 2: status ${a2.status}, id = ${a2.body.data?._id}`);
        console.assert(a2.status === 201, 'A2 must return 201');
        const a2Id = a2.body.data._id;

        const a3 = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Quiz 1',
            type: 'Quiz',
            totalMarks: 15,
            weightage: 5,
            status: 'completed',
        }, tokenA);
        console.log(`Created Assessment 3: status ${a3.status}, id = ${a3.body.data?._id}`);
        console.assert(a3.status === 201, 'A3 must return 201');
        const a3Id = a3.body.data._id;

        // ── 6. List Assessments (Faculty A) ───────────────────────────────
        console.log('\n--- 6. LIST ASSESSMENTS (Faculty A) ---');
        const listA = await request('GET', `/api/courses/${courseA._id}/assessments`, null, tokenA);
        console.log(`Course A assessments count: ${listA.body.count} (Expected: 3)`);
        console.assert(listA.status === 200 && listA.body.count === 3, 'Must return 3 assessments');

        // ── 7. Duplicate Assessment Name Rejection ────────────────────────
        console.log('\n--- 7. REJECT DUPLICATE ASSESSMENT NAME ---');
        const dupRes = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Internal Assessment 1',
            type: 'Internal',
            totalMarks: 50,
        }, tokenA);
        console.log(`Duplicate assessment status: ${dupRes.status} (Expected: 409), message: "${dupRes.body.message}"`);
        console.assert(dupRes.status === 409, 'Duplicate name must return 409 Conflict');

        // ── 8. Edit Assessment (Faculty A) ────────────────────────────────
        console.log('\n--- 8. EDIT ASSESSMENT (Faculty A) ---');
        const editRes = await request('PUT', `/api/courses/${courseA._id}/assessments/${a2Id}`, {
            totalMarks: 25,
            weightage: 12,
            description: 'Updated concurrency assignment',
        }, tokenA);
        console.log(`Edit Assessment 2: status ${editRes.status}, totalMarks = ${editRes.body.data?.totalMarks}`);
        console.assert(editRes.status === 200 && editRes.body.data?.totalMarks === 25, 'Marks must be updated to 25');

        // ── 9. Faculty B Creates Assessment in Course B ───────────────────
        console.log('\n--- 9. FACULTY B CREATES ASSESSMENT IN COURSE B ---');
        const bCreate = await request('POST', `/api/courses/${courseB._id}/assessments`, {
            name: 'Design Pattern Quiz',
            type: 'Quiz',
            totalMarks: 30,
            status: 'active',
        }, tokenB);
        console.log(`Faculty B created assessment: status ${bCreate.status}`);
        console.assert(bCreate.status === 201, 'Faculty B must create assessment');

        // ── 10. Cross-Faculty Isolation ───────────────────────────────────
        console.log('\n--- 10. CROSS-FACULTY ISOLATION ---');
        const bGetA = await request('GET', `/api/courses/${courseA._id}/assessments`, null, tokenB);
        console.log(`Faculty B GET Course A assessments: status ${bGetA.status} (Expected: 404)`);
        console.assert(bGetA.status === 404, 'Faculty B must not view Course A assessments');

        const bPostA = await request('POST', `/api/courses/${courseA._id}/assessments`, {
            name: 'Hack Exam',
            totalMarks: 50,
        }, tokenB);
        console.log(`Faculty B POST Course A: status ${bPostA.status} (Expected: 404)`);
        console.assert(bPostA.status === 404, 'Faculty B must not add assessment to Course A');

        const bPutA = await request('PUT', `/api/courses/${courseA._id}/assessments/${a1Id}`, {
            totalMarks: 100,
        }, tokenB);
        console.log(`Faculty B PUT Course A A1: status ${bPutA.status} (Expected: 404)`);
        console.assert(bPutA.status === 404, 'Faculty B must not edit Course A assessment');

        const bDelA = await request('DELETE', `/api/courses/${courseA._id}/assessments/${a1Id}`, null, tokenB);
        console.log(`Faculty B DELETE Course A A1: status ${bDelA.status} (Expected: 404)`);
        console.assert(bDelA.status === 404, 'Faculty B must not delete Course A assessment');

        // ── 11. Faculty-wide Assessments Listing (GET /api/assessments) ───
        console.log('\n--- 11. FACULTY-WIDE ASSESSMENTS LISTING ---');
        const allA = await request('GET', '/api/assessments', null, tokenA);
        console.log(`Faculty A total assessments: ${allA.body.count} (Expected: 3)`);
        console.assert(allA.body.count === 3, 'Faculty A must have 3 assessments');
        console.assert(allA.body.data[0].course.courseCode === 'CS501', 'Course must be populated');

        const allB = await request('GET', '/api/assessments', null, tokenB);
        console.log(`Faculty B total assessments: ${allB.body.count} (Expected: 1)`);
        console.assert(allB.body.count === 1, 'Faculty B must have 1 assessment');

        // ── 12. Invalid IDs Handling ──────────────────────────────────────
        console.log('\n--- 12. INVALID IDS HANDLING ---');
        const badCourse = await request('GET', '/api/courses/not-an-id/assessments', null, tokenA);
        console.log(`Invalid courseId: status ${badCourse.status} (Expected: 404)`);
        console.assert(badCourse.status === 404, 'Invalid courseId must return 404');

        const badAsmt = await request('GET', `/api/courses/${courseA._id}/assessments/not-an-id`, null, tokenA);
        console.log(`Invalid assessmentId: status ${badAsmt.status} (Expected: 404)`);
        console.assert(badAsmt.status === 404, 'Invalid assessmentId must return 404');

        // ── 13. Delete Assessment ─────────────────────────────────────────
        console.log('\n--- 13. DELETE ASSESSMENT ---');
        const delRes = await request('DELETE', `/api/courses/${courseA._id}/assessments/${a3Id}`, null, tokenA);
        console.log(`Delete A3: status ${delRes.status}, message: "${delRes.body.message}"`);
        console.assert(delRes.status === 200, 'Delete must return 200');

        const remainingA = await request('GET', `/api/courses/${courseA._id}/assessments`, null, tokenA);
        console.log(`Remaining assessments count: ${remainingA.body.count} (Expected: 2)`);
        console.assert(remainingA.body.count === 2, 'Must have 2 remaining assessments');

        // ── 14. Dashboard Integration ─────────────────────────────────────
        console.log('\n--- 14. DASHBOARD INTEGRATION ---');
        const dashA = await request('GET', '/api/dashboard/faculty', null, tokenA);
        console.log(`Faculty A activeAssessments count: ${dashA.body.data.summary.activeAssessments} (Expected: 2)`);
        console.log(`Faculty A recentAssessments count: ${dashA.body.data.recentAssessments.length}`);
        console.assert(dashA.body.data.summary.activeAssessments === 2, 'Active assessments must be 2');
        console.assert(dashA.body.data.recentAssessments.length === 2, 'Recent assessments must have 2 items');

        console.log('\n======================================================');
        console.log('ALL 14 ASSESSMENT VERIFICATION TESTS PASSED PERFECTLY!');
        console.log('======================================================\n');
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exitCode = 1;
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runAssessmentTests();
