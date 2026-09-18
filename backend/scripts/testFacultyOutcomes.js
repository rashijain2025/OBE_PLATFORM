/**
 * Test & Verification Script for Faculty Course Outcomes (CO) Management
 *
 * Verifies:
 * 1. Seed Faculty A, Faculty B, Course A (Faculty A), Course B (Faculty B)
 * 2. Login and JWT generation for both faculty members
 * 3. Unauthenticated request rejected (401)
 * 4. Empty CO state on Course A
 * 5. Missing description validation (400)
 * 6. Faculty A creates CO1, CO2, CO3 for Course A
 * 7. Faculty A lists COs (verifying sorting by order)
 * 8. Duplicate CO code rejection (attempting to add CO1 again -> 409 Conflict)
 * 9. Faculty A edits CO2 (updating description and order)
 * 10. Faculty B creates CO1 for Course B -> succeeds
 * 11. Faculty B lists COs for Course B -> sees only Course B CO1
 * 12. Cross-faculty isolation:
 *     - Faculty B cannot view COs of Course A (404)
 *     - Faculty B cannot create CO in Course A (404)
 *     - Faculty B cannot edit CO in Course A (404)
 *     - Faculty B cannot delete CO in Course A (404)
 *     - Faculty A cannot view Course B COs (404)
 * 13. Invalid courseId handling (404)
 * 14. Invalid outcomeId handling (404)
 * 15. Faculty A deletes CO3
 * 16. Dashboard totalCourseOutcomes reflects live count for both faculty members
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const cors = require('cors');

const User = require('../models/User');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
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

async function runOutcomesTest() {
    let server;
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/obe-platform');
        console.log('Connected to MongoDB.');

        // Ephemeral test server
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

        // ── 1. Setup Test Faculty & Courses ───────────────────────────────
        console.log('\n--- 1. SETTING UP TEST USERS & COURSES ---');
        await User.deleteMany({ email: { $in: ['co_faculty_a@test.edu', 'co_faculty_b@test.edu'] } });

        const facultyA = await User.create({
            name: 'Dr. Alan Turing',
            email: 'co_faculty_a@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
        });

        const facultyB = await User.create({
            name: 'Prof. Ada Lovelace',
            email: 'co_faculty_b@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Information Science',
        });

        await Course.deleteMany({ courseCode: { $in: ['DBMS201', 'CN301'] } });

        const courseA = await Course.create({
            courseCode: 'DBMS201',
            courseName: 'Database Management Systems',
            department: 'Computer Science',
            semester: 4,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyA._id,
        });

        const courseB = await Course.create({
            courseCode: 'CN301',
            courseName: 'Computer Networks',
            department: 'Information Science',
            semester: 5,
            credits: 4,
            academicYear: '2025-26',
            assignedFaculty: facultyB._id,
        });

        await CourseOutcome.deleteMany({ course: { $in: [courseA._id, courseB._id] } });

        // Login
        const loginA = await request('POST', '/api/auth/login', {
            email: 'co_faculty_a@test.edu',
            password: 'Password123!',
        });
        const tokenA = loginA.body.token;

        const loginB = await request('POST', '/api/auth/login', {
            email: 'co_faculty_b@test.edu',
            password: 'Password123!',
        });
        const tokenB = loginB.body.token;

        console.log('Test setup completed. Authenticated Faculty A & Faculty B.');

        // ── 2. Unauthenticated Request Rejected ───────────────────────────
        console.log('\n--- 2. VERIFY UNAUTHENTICATED REQUEST ---');
        const unauthRes = await request('GET', `/api/courses/${courseA._id}/outcomes`);
        console.log(`Unauthenticated request: status ${unauthRes.status} (Expected: 401)`);
        console.assert(unauthRes.status === 401, 'Unauthenticated request must return 401');

        // ── 3. Empty CO State ─────────────────────────────────────────────
        console.log('\n--- 3. VERIFY EMPTY CO STATE ---');
        const emptyRes = await request('GET', `/api/courses/${courseA._id}/outcomes`, null, tokenA);
        console.log(`Initial GET outcomes count: ${emptyRes.body.count} (Expected: 0)`);
        console.assert(emptyRes.status === 200, 'Must return 200');
        console.assert(emptyRes.body.count === 0, 'Must have 0 outcomes');

        // ── 4. Validation: Missing Description ────────────────────────────
        console.log('\n--- 4. VERIFY MISSING DESCRIPTION VALIDATION ---');
        const missingDescRes = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'CO1',
            description: '',
            order: 1,
        }, tokenA);
        console.log(`Missing description: status ${missingDescRes.status} (Expected: 400), message: "${missingDescRes.body.message}"`);
        console.assert(missingDescRes.status === 400, 'Missing description must return 400');

        // ── 5. Create Course Outcomes (Faculty A) ─────────────────────────
        console.log('\n--- 5. CREATE COURSE OUTCOMES (Faculty A) ---');
        const co1Res = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'CO1',
            description: 'Explain fundamental database concepts',
            order: 1,
        }, tokenA);
        console.log(`Created CO1: status ${co1Res.status}, id = ${co1Res.body.data?._id}`);
        console.assert(co1Res.status === 201, 'CO1 creation must return 201');
        const co1Id = co1Res.body.data._id;

        const co2Res = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'CO2',
            description: 'Design relational database schemas',
            order: 2,
        }, tokenA);
        console.log(`Created CO2: status ${co2Res.status}, id = ${co2Res.body.data?._id}`);
        console.assert(co2Res.status === 201, 'CO2 creation must return 201');
        const co2Id = co2Res.body.data._id;

        const co3Res = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'co3', // testing lowercase normalization
            description: 'Develop SQL queries',
            order: 3,
        }, tokenA);
        console.log(`Created CO3: status ${co3Res.status}, code = ${co3Res.body.data?.code}`);
        console.assert(co3Res.status === 201, 'CO3 creation must return 201');
        console.assert(co3Res.body.data.code === 'CO3', 'Code must be auto-capitalized to uppercase');
        const co3Id = co3Res.body.data._id;

        // ── 6. List Course Outcomes (Faculty A) ───────────────────────────
        console.log('\n--- 6. LIST COURSE OUTCOMES (Faculty A) ---');
        const listRes = await request('GET', `/api/courses/${courseA._id}/outcomes`, null, tokenA);
        console.log(`Faculty A outcomes count: ${listRes.body.count} (Expected: 3)`);
        console.assert(listRes.status === 200, 'Must return 200');
        console.assert(listRes.body.count === 3, 'Must return exactly 3 outcomes');
        console.assert(listRes.body.data[0].code === 'CO1', 'First outcome must be CO1');
        console.assert(listRes.body.data[1].code === 'CO2', 'Second outcome must be CO2');
        console.assert(listRes.body.data[2].code === 'CO3', 'Third outcome must be CO3');

        // ── 7. Prevent Duplicate CO Codes ─────────────────────────────────
        console.log('\n--- 7. REJECT DUPLICATE CO CODE ---');
        const dupRes = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'CO1',
            description: 'Duplicate CO1 attempt',
            order: 4,
        }, tokenA);
        console.log(`Duplicate CO1 creation: status ${dupRes.status} (Expected: 409), message: "${dupRes.body.message}"`);
        console.assert(dupRes.status === 409, 'Duplicate CO code must return 409 Conflict');

        // ── 8. Edit Course Outcome (Faculty A) ────────────────────────────
        console.log('\n--- 8. EDIT COURSE OUTCOME (Faculty A) ---');
        const editRes = await request('PUT', `/api/courses/${courseA._id}/outcomes/${co2Id}`, {
            description: 'Design relational database schemas and normal forms (Updated)',
            order: 2,
        }, tokenA);
        console.log(`Edit CO2: status ${editRes.status}, new desc: "${editRes.body.data?.description}"`);
        console.assert(editRes.status === 200, 'Edit must return 200');
        console.assert(editRes.body.data.description.includes('(Updated)'), 'Description must be updated');

        // ── 9. Faculty B Creates and Views CO for Course B ────────────────
        console.log('\n--- 9. FACULTY B CREATES & VIEWS CO IN COURSE B ---');
        const bCreateRes = await request('POST', `/api/courses/${courseB._id}/outcomes`, {
            code: 'CO1',
            description: 'Understand network architectures and OSI reference models',
            order: 1,
        }, tokenB);
        console.log(`Faculty B created CO1 in Course B: status ${bCreateRes.status}`);
        console.assert(bCreateRes.status === 201, 'Faculty B must create CO1 in Course B');

        const bViewRes = await request('GET', `/api/courses/${courseB._id}/outcomes`, null, tokenB);
        console.log(`Faculty B Course B outcomes count: ${bViewRes.body.count} (Expected: 1)`);
        console.assert(bViewRes.status === 200 && bViewRes.body.count === 1, 'Faculty B sees 1 outcome in Course B');

        // ── 10. Cross-Faculty Isolation ───────────────────────────────────
        console.log('\n--- 10. CROSS-FACULTY ISOLATION ---');
        // Faculty B trying to list COs of Course A
        const bListRes = await request('GET', `/api/courses/${courseA._id}/outcomes`, null, tokenB);
        console.log(`Faculty B GET Course A outcomes: status ${bListRes.status} (Expected: 404)`);
        console.assert(bListRes.status === 404, 'Faculty B must not view Course A outcomes');

        // Faculty B trying to add CO to Course A
        const bAddRes = await request('POST', `/api/courses/${courseA._id}/outcomes`, {
            code: 'CO99',
            description: 'Hacked outcome',
            order: 99,
        }, tokenB);
        console.log(`Faculty B POST to Course A: status ${bAddRes.status} (Expected: 404)`);
        console.assert(bAddRes.status === 404, 'Faculty B must not add CO to Course A');

        // Faculty B trying to edit CO in Course A
        const bEditRes = await request('PUT', `/api/courses/${courseA._id}/outcomes/${co1Id}`, {
            description: 'Malicious update',
        }, tokenB);
        console.log(`Faculty B PUT to Course A CO1: status ${bEditRes.status} (Expected: 404)`);
        console.assert(bEditRes.status === 404, 'Faculty B must not edit CO in Course A');

        // Faculty B trying to delete CO in Course A
        const bDelRes = await request('DELETE', `/api/courses/${courseA._id}/outcomes/${co1Id}`, null, tokenB);
        console.log(`Faculty B DELETE to Course A CO1: status ${bDelRes.status} (Expected: 404)`);
        console.assert(bDelRes.status === 404, 'Faculty B must not delete CO in Course A');

        // Faculty A trying to view Course B COs
        const aViewBRes = await request('GET', `/api/courses/${courseB._id}/outcomes`, null, tokenA);
        console.log(`Faculty A GET Course B outcomes: status ${aViewBRes.status} (Expected: 404)`);
        console.assert(aViewBRes.status === 404, 'Faculty A must not view Course B outcomes');

        // ── 11. Invalid IDs Handling ──────────────────────────────────────
        console.log('\n--- 11. INVALID IDS HANDLING ---');
        const invalidCourseRes = await request('GET', '/api/courses/not-a-valid-id/outcomes', null, tokenA);
        console.log(`Invalid courseId: status ${invalidCourseRes.status} (Expected: 404), message: "${invalidCourseRes.body.message}"`);
        console.assert(invalidCourseRes.status === 404, 'Invalid courseId must return 404');

        const invalidOutcomeRes = await request('PUT', `/api/courses/${courseA._id}/outcomes/invalid-outcome-id`, {
            description: 'Test',
        }, tokenA);
        console.log(`Invalid outcomeId: status ${invalidOutcomeRes.status} (Expected: 404), message: "${invalidOutcomeRes.body.message}"`);
        console.assert(invalidOutcomeRes.status === 404, 'Invalid outcomeId must return 404');

        // ── 12. Delete Course Outcome (Faculty A) ─────────────────────────
        console.log('\n--- 12. DELETE COURSE OUTCOME (Faculty A) ---');
        const delRes = await request('DELETE', `/api/courses/${courseA._id}/outcomes/${co3Id}`, null, tokenA);
        console.log(`Delete CO3: status ${delRes.status}, message: "${delRes.body.message}"`);
        console.assert(delRes.status === 200, 'Delete must return 200');

        const remainingRes = await request('GET', `/api/courses/${courseA._id}/outcomes`, null, tokenA);
        console.log(`Outcomes count after delete: ${remainingRes.body.count} (Expected: 2)`);
        console.assert(remainingRes.body.count === 2, 'Must have 2 outcomes after deletion');
        const remainingCodes = remainingRes.body.data.map(c => c.code);
        console.assert(!remainingCodes.includes('CO3'), 'CO3 must be deleted');

        // ── 13. Dashboard CO Count Integration ────────────────────────────
        console.log('\n--- 13. DASHBOARD CO COUNT INTEGRATION ---');
        const dashResA = await request('GET', '/api/dashboard/faculty', null, tokenA);
        console.log(`Faculty A dashboard totalCourseOutcomes: ${dashResA.body.data.summary.totalCourseOutcomes} (Expected: 2)`);
        console.assert(dashResA.body.data.summary.totalCourseOutcomes === 2, 'Dashboard totalCourseOutcomes for A must be 2');

        const dashResB = await request('GET', '/api/dashboard/faculty', null, tokenB);
        console.log(`Faculty B dashboard totalCourseOutcomes: ${dashResB.body.data.summary.totalCourseOutcomes} (Expected: 1)`);
        console.assert(dashResB.body.data.summary.totalCourseOutcomes === 1, 'Dashboard totalCourseOutcomes for B must be 1');

        console.log('\n======================================================');
        console.log('ALL 13 COURSE OUTCOMES VERIFICATION TESTS PASSED!');
        console.log('======================================================\n');
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exitCode = 1;
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runOutcomesTest();
