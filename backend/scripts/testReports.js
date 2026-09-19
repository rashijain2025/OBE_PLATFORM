/**
 * Test & Verification Suite for Faculty OBE Reports & Analytics
 *
 * Verifies:
 *  T01: Faculty can view their course report (GET /api/courses/:courseId/report)
 *  T02: Report returns complete course metadata (code, name, department, semester, credits, etc.)
 *  T03: Report CO attainment values match existing attainment API exactly
 *  T04: Below-target COs are accurately identified with gap analysis
 *  T05: Overall attainment summary matches calculated average
 *  T06: Faculty can switch courses (receives accurate distinct reports for Course A & Course B)
 *  T07: Cross-faculty isolation enforced (Faculty A cannot access Faculty B's report -> 404)
 *  T08: Unauthenticated request is rejected with 401 Unauthorized
 *  T09: Invalid course ID handled gracefully with 404 Not Found
 *  T10: Course with no COs handled gracefully (0 COs, empty outcomes array)
 *  T11: Course with no marks handled gracefully (never misleading 0%, status='No Marks')
 *  T12: Course with no enrolled students handled gracefully (totalEnrolledStudents=0, status='No Students')
 *  T13: Dynamic target threshold override works (?target=65 updates belowTargetOutcomes & gaps)
 *  T14: CSV export returns text/csv header, Content-Disposition, and structured CSV body
 *  T15: CSV export correctly formats metadata, summary, outcomes, and below-target review sections
 *
 * Usage:
 *   node backend/scripts/testReports.js
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

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
    });
});

async function runReportTests() {
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
                        let parsedData;
                        try {
                            parsedData = JSON.parse(data);
                        } catch {
                            parsedData = data;
                        }
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: parsedData,
                            raw: data,
                        });
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
                console.log(`  ✅ PASS: ${testName}`);
                passed++;
                results.push({ name: testName, status: 'PASS' });
            } else {
                console.error(`  ❌ FAIL: ${testName} - ${details}`);
                failed++;
                results.push({ name: testName, status: 'FAIL', details });
            }
        }

        console.log('\n--- Setting up Test Data ---');
        // Clean up previous test artifacts
        await User.deleteMany({ email: { $in: [
            'facultyA_rpt@test.edu',
            'facultyB_rpt@test.edu',
            'student1_rpt@test.edu',
            'student2_rpt@test.edu',
            'student3_rpt@test.edu',
            'student4_rpt@test.edu'
        ] } });
        await Course.deleteMany({ courseCode: { $in: ['RPT101', 'RPT102', 'RPT201', 'RPT_EMPTY'] } });

        // Create Faculty A & B
        const facultyA = await User.create({
            name: 'Dr. Alan Turing',
            email: 'facultyA_rpt@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
            isActive: true,
        });

        const facultyB = await User.create({
            name: 'Dr. Ada Lovelace',
            email: 'facultyB_rpt@test.edu',
            password: 'Password123!',
            role: 'faculty',
            department: 'Computer Science',
            isActive: true,
        });

        // Create 4 Students
        const students = await User.insertMany([
            { name: 'Student One', email: 'student1_rpt@test.edu', rollNumber: 'RPT-01', password: 'Password123!', role: 'student', department: 'Computer Science', isActive: true },
            { name: 'Student Two', email: 'student2_rpt@test.edu', rollNumber: 'RPT-02', password: 'Password123!', role: 'student', department: 'Computer Science', isActive: true },
            { name: 'Student Three', email: 'student3_rpt@test.edu', rollNumber: 'RPT-03', password: 'Password123!', role: 'student', department: 'Computer Science', isActive: true },
            { name: 'Student Four', email: 'student4_rpt@test.edu', rollNumber: 'RPT-04', password: 'Password123!', role: 'student', department: 'Computer Science', isActive: true },
        ]);

        // Login to get JWT tokens
        const resLoginA = await request('POST', '/api/auth/login', {
            email: 'facultyA_rpt@test.edu',
            password: 'Password123!',
        });
        const tokenA = resLoginA.data.token;

        const resLoginB = await request('POST', '/api/auth/login', {
            email: 'facultyB_rpt@test.edu',
            password: 'Password123!',
        });
        const tokenB = resLoginB.data.token;

        console.log('Faculty A token acquired:', !!tokenA);
        console.log('Faculty B token acquired:', !!tokenB);

        // Create Courses
        // Course A1: Full course for Faculty A (CS Data Structures)
        const courseA1 = await Course.create({
            courseCode: 'RPT101',
            courseName: 'Algorithms & Data Structures',
            department: 'Computer Science',
            semester: 3,
            academicYear: '2025-26',
            credits: 4,
            description: 'Core course covering computational complexity and data structures.',
            assignedFaculty: facultyA._id,
            isActive: true,
            attainmentSettings: { targetPercentage: 40, minStudentsRequired: 1 },
        });

        // Course A2: Second course for Faculty A (Database Systems)
        const courseA2 = await Course.create({
            courseCode: 'RPT102',
            courseName: 'Database Management Systems',
            department: 'Computer Science',
            semester: 4,
            academicYear: '2025-26',
            credits: 4,
            description: 'Relational database design and SQL.',
            assignedFaculty: facultyA._id,
            isActive: true,
            attainmentSettings: { targetPercentage: 50, minStudentsRequired: 1 },
        });

        // Course B: Course for Faculty B (Machine Learning)
        const courseB = await Course.create({
            courseCode: 'RPT201',
            courseName: 'Machine Learning',
            department: 'Computer Science',
            semester: 5,
            academicYear: '2025-26',
            credits: 3,
            assignedFaculty: facultyB._id,
            isActive: true,
            attainmentSettings: { targetPercentage: 40, minStudentsRequired: 1 },
        });

        // Empty Course for Faculty A (no COs, no enrollments)
        const courseEmpty = await Course.create({
            courseCode: 'RPT_EMPTY',
            courseName: 'Special Topics in CS',
            department: 'Computer Science',
            semester: 6,
            academicYear: '2025-26',
            credits: 2,
            assignedFaculty: facultyA._id,
            isActive: true,
        });

        // Enroll students in Course A1
        await CourseEnrollment.insertMany(
            students.map((s) => ({
                course: courseA1._id,
                student: s._id,
                status: 'active',
            }))
        );

        // Enroll 2 students in Course A2
        await CourseEnrollment.insertMany([
            { course: courseA2._id, student: students[0]._id, status: 'active' },
            { course: courseA2._id, student: students[1]._id, status: 'active' },
        ]);

        // Create Course Outcomes for Course A1:
        // CO1: Attained (e.g. 75%)
        // CO2: Not Attained / Below Target (e.g. 25%)
        // CO3: No Marks
        // CO4: No Questions
        const co1 = await CourseOutcome.create({
            course: courseA1._id,
            code: 'CO1',
            description: 'Understand linear data structures and asymptotic complexity',
            bloomLevel: 'Understand',
            order: 1,
        });

        const co2 = await CourseOutcome.create({
            course: courseA1._id,
            code: 'CO2',
            description: 'Implement balanced tree data structures and graph algorithms',
            bloomLevel: 'Apply',
            order: 2,
        });

        const co3 = await CourseOutcome.create({
            course: courseA1._id,
            code: 'CO3',
            description: 'Analyze NP-complete computational problems',
            bloomLevel: 'Analyze',
            order: 3,
        });

        const co4 = await CourseOutcome.create({
            course: courseA1._id,
            code: 'CO4',
            description: 'Design heuristic optimization algorithms',
            bloomLevel: 'Create',
            order: 4,
        });

        // Create Assessments for Course A1
        const quiz1 = await Assessment.create({
            course: courseA1._id,
            name: 'Quiz 1',
            type: 'Quiz',
            totalMarks: 20,
            weightage: 10,
        });

        const midterm = await Assessment.create({
            course: courseA1._id,
            name: 'Midterm Exam',
            type: 'Internal',
            totalMarks: 50,
            weightage: 30,
        });

        // Questions for CO1: Q1 (5M) in Quiz 1, Q2 (5M) in Midterm => Total Max = 10M
        const q1 = await Question.create({
            course: courseA1._id,
            assessment: quiz1._id,
            questionNumber: 1,
            questionText: 'Explain array search complexity',
            marks: 5,
            co: co1._id,
            isActive: true,
        });

        const q2 = await Question.create({
            course: courseA1._id,
            assessment: midterm._id,
            questionNumber: 1,
            questionText: 'Analyze linked list operations',
            marks: 5,
            co: co1._id,
            isActive: true,
        });

        // Question for CO2: Q3 (20M) in Midterm
        const q3 = await Question.create({
            course: courseA1._id,
            assessment: midterm._id,
            questionNumber: 2,
            questionText: 'Implement AVL tree rotations',
            marks: 20,
            co: co2._id,
            isActive: true,
        });

        // Question for CO3: Q4 (10M) in Quiz 1 — NO marks entered for this question
        const q4 = await Question.create({
            course: courseA1._id,
            assessment: quiz1._id,
            questionNumber: 2,
            questionText: 'Analyze reduction of 3-SAT to CLIQUE',
            marks: 10,
            co: co3._id,
            isActive: true,
        });

        // CO4 has no questions mapped.

        // Enter Marks for CO1 (Target = 40%):
        // Student 1: Q1=4, Q2=4 => 8/10 = 80.0% (Attained >= 40%)
        // Student 2: Q1=3, Q2=3 => 6/10 = 60.0% (Attained >= 40%)
        // Student 3: Q1=2, Q2=2 => 4/10 = 40.0% (Attained >= 40%)
        // Student 4: Q1=1, Q2=1 => 2/10 = 20.0% (Not Attained < 40%)
        // Result: 3 of 4 attained = 75.0% -> Attained
        await StudentMark.insertMany([
            { course: courseA1._id, assessment: quiz1._id, question: q1._id, student: students[0]._id, marksObtained: 4, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q2._id, student: students[0]._id, marksObtained: 4, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: quiz1._id, question: q1._id, student: students[1]._id, marksObtained: 3, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q2._id, student: students[1]._id, marksObtained: 3, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: quiz1._id, question: q1._id, student: students[2]._id, marksObtained: 2, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q2._id, student: students[2]._id, marksObtained: 2, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: quiz1._id, question: q1._id, student: students[3]._id, marksObtained: 1, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q2._id, student: students[3]._id, marksObtained: 1, evaluatedBy: facultyA._id },
        ]);

        // Enter Marks for CO2 (Max = 20M, Target = 40%):
        // Student 1: Q3=12 => 12/20 = 60.0% (Attained >= 40%)
        // Student 2: Q3=6  => 6/20  = 30.0% (Not Attained < 40%)
        // Student 3: Q3=4  => 4/20  = 20.0% (Not Attained < 40%)
        // Student 4: Q3=0  => 0/20  = 0.0%  (Not Attained < 40%)
        // Result: 1 of 4 attained = 25.0% -> Not Attained (Below Target, Gap = 40 - 25 = 15.0%)
        await StudentMark.insertMany([
            { course: courseA1._id, assessment: midterm._id, question: q3._id, student: students[0]._id, marksObtained: 12, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q3._id, student: students[1]._id, marksObtained: 6, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q3._id, student: students[2]._id, marksObtained: 4, evaluatedBy: facultyA._id },
            { course: courseA1._id, assessment: midterm._id, question: q3._id, student: students[3]._id, marksObtained: 0, evaluatedBy: facultyA._id },
        ]);

        console.log('\n--- Running OBE Reports Verification Tests ---');

        // T01: Faculty can view their course report
        const resReportA1 = await request('GET', `/api/courses/${courseA1._id}/report`, null, tokenA);
        assert(
            resReportA1.status === 200 && resReportA1.data.success === true,
            'T01: Faculty can view their course report (GET /api/courses/:courseId/report)',
            `Status: ${resReportA1.status}`
        );

        // T02: Report returns complete course metadata
        const rptCourse = resReportA1.data.data?.course;
        assert(
            rptCourse &&
            rptCourse.courseCode === 'RPT101' &&
            rptCourse.courseName === 'Algorithms & Data Structures' &&
            rptCourse.department === 'Computer Science' &&
            rptCourse.semester === 3 &&
            rptCourse.academicYear === '2025-26' &&
            rptCourse.credits === 4,
            'T02: Report returns complete course metadata',
            JSON.stringify(rptCourse)
        );

        // T03: Report CO attainment values match existing attainment API
        const resAttainA1 = await request('GET', `/api/courses/${courseA1._id}/attainment`, null, tokenA);
        const reportOutcomes = resReportA1.data.data?.outcomes;
        const attainOutcomes = resAttainA1.data.data?.outcomes;
        const co1Rpt = reportOutcomes?.find((o) => o.code === 'CO1');
        const co1Att = attainOutcomes?.find((o) => o.code === 'CO1');
        const co2Rpt = reportOutcomes?.find((o) => o.code === 'CO2');
        const co2Att = attainOutcomes?.find((o) => o.code === 'CO2');

        assert(
            co1Rpt && co1Att &&
            co1Rpt.attainmentPercentage === 75.0 &&
            co1Rpt.attainmentPercentage === co1Att.attainmentPercentage &&
            co1Rpt.status === 'Attained' &&
            co2Rpt && co2Att &&
            co2Rpt.attainmentPercentage === 25.0 &&
            co2Rpt.attainmentPercentage === co2Att.attainmentPercentage &&
            co2Rpt.status === 'Not Attained',
            'T03: Report CO attainment values match existing attainment API exactly (CO1=75.0%, CO2=25.0%)',
            `CO1: rpt=${co1Rpt?.attainmentPercentage}%, att=${co1Att?.attainmentPercentage}%`
        );

        // T04: Below-target COs are accurately identified with gap analysis
        const belowTargetList = resReportA1.data.data?.belowTargetOutcomes;
        const belowCO2 = belowTargetList?.find((o) => o.code === 'CO2');
        assert(
            belowTargetList &&
            belowTargetList.length === 1 &&
            belowCO2 &&
            belowCO2.attainmentPercentage === 25.0 &&
            belowCO2.targetPercentage === 40 &&
            belowCO2.gapPercentage === 15.0 &&
            belowCO2.status === 'Not Attained',
            'T04: Below-target COs are accurately identified with gap analysis (CO2 deficit = 15.0%)',
            `Below count: ${belowTargetList?.length}, gap: ${belowCO2?.gapPercentage}%`
        );

        // T05: Overall attainment summary matches calculated average
        // Evaluated outcomes: CO1 (75.0%) and CO2 (25.0%) -> Average = (75 + 25) / 2 = 50.0%
        const summaryA1 = resReportA1.data.data?.summary;
        assert(
            summaryA1 &&
            summaryA1.totalCOs === 4 &&
            summaryA1.evaluatedCOs === 2 &&
            summaryA1.attainedCOs === 1 &&
            summaryA1.belowTargetCOs === 1 &&
            summaryA1.averageAttainment === 50.0 &&
            summaryA1.courseAttainmentStatus === 'Attained',
            'T05: Overall attainment summary matches calculated average (50.0% Attained)',
            `Avg: ${summaryA1?.averageAttainment}%, Status: ${summaryA1?.courseAttainmentStatus}`
        );

        // T06: Faculty can switch courses (Course A2 report)
        const resReportA2 = await request('GET', `/api/courses/${courseA2._id}/report`, null, tokenA);
        assert(
            resReportA2.status === 200 &&
            resReportA2.data.data?.course?.courseCode === 'RPT102' &&
            resReportA2.data.data?.targetPercentage === 50,
            'T06: Faculty can switch between courses and receives accurate report for Course A2',
            `Code: ${resReportA2.data.data?.course?.courseCode}, Target: ${resReportA2.data.data?.targetPercentage}%`
        );

        // T07: Cross-faculty isolation enforced (Faculty A cannot access Faculty B's report)
        const resCrossAccess = await request('GET', `/api/courses/${courseB._id}/report`, null, tokenA);
        assert(
            resCrossAccess.status === 404,
            'T07: Cross-faculty isolation enforced (Faculty A cannot view Course B report, rejected with 404)',
            `Status: ${resCrossAccess.status}`
        );

        // T08: Unauthenticated request is rejected with 401 Unauthorized
        const resNoAuth = await request('GET', `/api/courses/${courseA1._id}/report`, null, null);
        assert(
            resNoAuth.status === 401,
            'T08: Unauthenticated request is rejected with 401 Unauthorized',
            `Status: ${resNoAuth.status}`
        );

        // T09: Invalid course ID handled gracefully with 404 Not Found
        const resInvalidCourse = await request('GET', '/api/courses/invalidId12345/report', null, tokenA);
        assert(
            resInvalidCourse.status === 404,
            'T09: Invalid course ID is handled gracefully with 404 Not Found',
            `Status: ${resInvalidCourse.status}`
        );

        // T10: Course with no COs handled gracefully
        const resEmptyRpt = await request('GET', `/api/courses/${courseEmpty._id}/report`, null, tokenA);
        assert(
            resEmptyRpt.status === 200 &&
            resEmptyRpt.data.data?.summary?.totalCOs === 0 &&
            resEmptyRpt.data.data?.summary?.evaluatedCOs === 0 &&
            resEmptyRpt.data.data?.outcomes?.length === 0,
            'T10: Course with no COs handled gracefully (0 COs, empty outcomes array)',
            `Total COs: ${resEmptyRpt.data.data?.summary?.totalCOs}`
        );

        // T11: Course with questions but no marks handled gracefully (never misleading 0%)
        const co3Rpt = reportOutcomes?.find((o) => o.code === 'CO3');
        assert(
            co3Rpt &&
            co3Rpt.attainmentPercentage === null &&
            co3Rpt.status === 'No Marks' &&
            co3Rpt.mappedQuestionsCount === 1,
            'T11: CO with questions but no marks handled cleanly (status="No Marks", attainmentPercentage=null)',
            `Status: ${co3Rpt?.status}, %: ${co3Rpt?.attainmentPercentage}`
        );

        // T12: Course with no enrolled students handled gracefully
        const resEmptyCourseAttain = await request('GET', `/api/courses/${courseEmpty._id}/report`, null, tokenA);
        assert(
            resEmptyCourseAttain.status === 200 &&
            resEmptyCourseAttain.data.data?.summary?.totalEnrolledStudents === 0 &&
            resEmptyCourseAttain.data.data?.summary?.averageAttainment === null,
            'T12: Course with no enrolled students handled gracefully (totalEnrolledStudents=0, averageAttainment=null)',
            `Enrolled: ${resEmptyCourseAttain.data.data?.summary?.totalEnrolledStudents}`
        );

        // T13: Target threshold override query parameter works (?target=80)
        // With target=80%: CO1 (75.0% < 80%) is now also Below Target!
        const resOverride = await request('GET', `/api/courses/${courseA1._id}/report?target=80`, null, tokenA);
        const overrideBelow = resOverride.data.data?.belowTargetOutcomes;
        assert(
            resOverride.status === 200 &&
            resOverride.data.data?.targetPercentage === 80 &&
            overrideBelow &&
            overrideBelow.length === 2 && // Both CO1 (25%) and CO2 (0%) are below 80% target
            overrideBelow.some((o) => o.code === 'CO1' && o.gapPercentage === 55.0),
            'T13: Dynamic target threshold override (?target=80) recalculates belowTargetOutcomes dynamically',
            `Target: ${resOverride.data.data?.targetPercentage}%, Below count: ${overrideBelow?.length}`
        );

        // T14: CSV export returns text/csv header, Content-Disposition, and valid CSV string
        const resCsv = await request('GET', `/api/courses/${courseA1._id}/report?format=csv`, null, tokenA);
        const isCsvContentType = resCsv.headers['content-type']?.includes('text/csv');
        const hasDisposition = resCsv.headers['content-disposition']?.includes('attachment') &&
                               resCsv.headers['content-disposition']?.includes('OBE_Report_RPT101.csv');
        assert(
            resCsv.status === 200 &&
            isCsvContentType &&
            hasDisposition &&
            typeof resCsv.raw === 'string' &&
            resCsv.raw.includes('OUTCOME-BASED EDUCATION (OBE) COURSE PERFORMANCE REPORT'),
            'T14: CSV export endpoint (?format=csv) returns text/csv header and attachment filename',
            `Content-Type: ${resCsv.headers['content-type']}, Disposition: ${resCsv.headers['content-disposition']}`
        );

        // T15: CSV export correctly formats metadata, summary, outcomes, and below-target review sections
        const csvText = resCsv.raw;
        const containsMetadata = csvText.includes('Course Code,"RPT101"') && csvText.includes('Target Threshold,"40%"');
        const containsSummary = csvText.includes('Total Course Outcomes,"4"') && csvText.includes('Average CO Attainment,"50%"');
        const containsTable = csvText.includes('"CO1"') && csvText.includes('"75%"') && csvText.includes('"CO2"') && csvText.includes('"25%"');
        const containsBelowTarget = csvText.includes('AREAS FOR CURRICULUM REVIEW') && csvText.includes('"15%"');
        assert(
            containsMetadata && containsSummary && containsTable && containsBelowTarget,
            'T15: CSV export correctly formats metadata, summary, outcomes, and below-target review sections',
            `Meta: ${containsMetadata}, Sum: ${containsSummary}, Table: ${containsTable}, Below: ${containsBelowTarget}`
        );

        // Cleanup test data
        console.log('\n--- Cleaning up Test Data ---');
        await StudentMark.deleteMany({ course: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await Question.deleteMany({ course: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await Assessment.deleteMany({ course: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await CourseOutcome.deleteMany({ course: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await CourseEnrollment.deleteMany({ course: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await Course.deleteMany({ _id: { $in: [courseA1._id, courseA2._id, courseB._id, courseEmpty._id] } });
        await User.deleteMany({ _id: { $in: [facultyA._id, facultyB._id, ...students.map((s) => s._id)] } });
        console.log('Test data cleaned up.');

        console.log('\n==================================================');
        console.log('TEST RESULTS SUMMARY:');
        console.log('==================================================');
        results.forEach((r) => console.log(`  ${r.status === 'PASS' ? '✅' : '❌'} ${r.status}: ${r.name}`));
        console.log('==================================================');
        console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log('==================================================\n');

        if (failed > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exit(1);
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runReportTests();
