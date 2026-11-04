process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User, Department, Programme, Course, CourseEnrollment } = require('../models');

describe('Phase 2 Admin Module Tests', () => {
  let adminToken;
  let facultyToken;
  let studentToken;
  let coordinatorToken;

  // IDs created during tests
  let createdUserId;
  let createdDeptId;
  let createdProgId;
  let createdCourseId;
  let createdEnrollmentId;
  let testFacultyId;
  let testStudentId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform');
    }
    // Clean up test artifacts from previous runs
    await User.deleteMany({ email: /^phase2test/ });
    await User.deleteMany({ rollNo: /^22IT80/ });
    await Department.deleteMany({ code: /^P2TEST/ });
    await Programme.deleteMany({ code: /^P2TEST/ });
    await Course.deleteMany({ code: /^P2COURSE/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /^phase2test/ });
    await User.deleteMany({ rollNo: /^22IT80/ });
    await Department.deleteMany({ code: /^P2TEST/ });
    await Programme.deleteMany({ code: /^P2TEST/ });
    await Course.deleteMany({ code: /^P2COURSE/ });
    await mongoose.connection.close();
  });

  // ─── Login Setup ────────────────────────────────────────────────────────────
  describe('Token Setup', () => {
    it('should obtain tokens for admin, coordinator, faculty and reject student login', async () => {
      const [adminRes, coordRes, facRes, stuRes] = await Promise.all([
        request(app).post('/api/auth/login').send({ email: 'admin@obe.edu', password: 'Password@123' }),
        request(app).post('/api/auth/login').send({ email: 'coordinator@obe.edu', password: 'Password@123' }),
        request(app).post('/api/auth/login').send({ email: 'faculty1@obe.edu', password: 'Password@123' }),
        request(app).post('/api/auth/login').send({ email: 'aarav.patel@student.obe.edu', password: 'Password@123' }),
      ]);

      expect(adminRes.statusCode).toBe(200);
      expect(coordRes.statusCode).toBe(200);
      expect(facRes.statusCode).toBe(200);
      expect(stuRes.statusCode).toBe(403);
      expect(stuRes.body.message).toBe('Student accounts cannot log in');

      adminToken = adminRes.body.data.token;
      coordinatorToken = coordRes.body.data.token;
      facultyToken = facRes.body.data.token;
      testFacultyId = facRes.body.data.user._id;

      const studentDoc = await User.findOne({ role: 'student' });
      testStudentId = studentDoc ? studentDoc._id.toString() : null;
    });
  });

  // ─── Users (Admin Only) ─────────────────────────────────────────────────────
  describe('GET /api/users (Admin only)', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for faculty', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('returns 403 for coordinator', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${coordinatorToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('admin can list users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      // No password hashes exposed
      res.body.data.users.forEach((u) => {
        expect(u.passwordHash).toBeUndefined();
      });
    });

    it('admin can filter users by role', async () => {
      const res = await request(app)
        .get('/api/users?role=student')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      res.body.data.users.forEach((u) => expect(u.role).toBe('student'));
    });
  });

  describe('POST /api/auth/register then user CRUD', () => {
    it('admin registers a new test user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Phase2 Test Faculty',
          email: 'phase2test.faculty@obe.edu',
          password: 'Password@123',
          role: 'faculty',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.passwordHash).toBeUndefined();
      createdUserId = res.body.data._id;
    });

    it('admin can get the created user', async () => {
      const res = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(createdUserId);
    });

    it('admin can update user name', async () => {
      const res = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Phase2 Test Faculty Updated' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Phase2 Test Faculty Updated');
    });

    it('admin can reset user password', async () => {
      const res = await request(app)
        .patch(`/api/users/${createdUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPass@456' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 400 if newPassword is missing', async () => {
      const res = await request(app)
        .patch(`/api/users/${createdUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('admin can deactivate user', async () => {
      const res = await request(app)
        .patch(`/api/users/${createdUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('admin can delete user', async () => {
      const res = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ─── Departments ─────────────────────────────────────────────────────────────
  describe('Departments API', () => {
    it('authenticated user can list departments', async () => {
      const res = await request(app).get('/api/departments').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 403 when non-admin tries to create a department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ name: 'Test Dept', code: 'P2TESTFAC' });
      expect(res.statusCode).toBe(403);
    });

    it('admin can create a department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'School of Architecture', code: 'P2TESTDEPT', description: 'For testing' });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdDeptId = res.body.data._id;
    });

    it('rejects a School / Centre name that is not in the fixed list', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Phase2 Test Department', code: 'P2BADNAME' });
      expect(res.statusCode).toBe(400);
    });

    it('admin can update the department', async () => {
      const res = await request(app)
        .put(`/api/departments/${createdDeptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.description).toBe('Updated description');
    });

    it('returns 400 when name/code is missing', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Missing Code Only' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Programmes ───────────────────────────────────────────────────────────────
  describe('Programmes API', () => {
    it('authenticated user can list programmes', async () => {
      const res = await request(app).get('/api/programmes').set('Authorization', `Bearer ${coordinatorToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('faculty gets 403 when creating a programme', async () => {
      const res = await request(app)
        .post('/api/programmes')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ name: 'Test', code: 'P2TESTPROG', department: createdDeptId });
      expect(res.statusCode).toBe(403);
    });

    it('admin can create a programme', async () => {
      const res = await request(app)
        .post('/api/programmes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Phase2 Test Programme',
          code: 'P2TESTPROG',
          department: createdDeptId,
          durationYears: 3,
          level: 'PG',
        });
      expect(res.statusCode).toBe(201);
      createdProgId = res.body.data._id;
    });
  });

  // ─── Courses ─────────────────────────────────────────────────────────────────
  describe('Courses API', () => {
    it('admin can bulk import student records by roll number', async () => {
      const res = await request(app)
        .post('/api/users/bulk-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rollNumbers: ['22IT801', '22IT802'],
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdCount).toBe(2);
    });

    it('admin can create a course', async () => {
      // Use seeded programme BTECH-IT
      const progRes = await request(app).get('/api/programmes').set('Authorization', `Bearer ${adminToken}`);
      const prog = progRes.body.data.find((p) => p.code === 'BTECH-IT');

      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'P2COURSE101',
          name: 'Phase2 Test Course',
          semester: 3,
          programme: prog._id,
          faculty: testFacultyId,
          academicYear: '2025-2026',
          credits: 4,
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.code).toBe('P2COURSE101');
      createdCourseId = res.body.data._id;
    });

    it('faculty can list their own courses', async () => {
      const res = await request(app).get('/api/courses').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 when required fields missing on create', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Missing Fields Course' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Enrollments ──────────────────────────────────────────────────────────────
  describe('Enrollments API', () => {
    it('admin can enroll a student', async () => {
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ courseId: createdCourseId, studentId: testStudentId });
      expect(res.statusCode).toBe(201);
      expect(String(res.body.data.student._id)).toBe(String(testStudentId));
      createdEnrollmentId = res.body.data._id;
    });

    it('returns 409 on duplicate enrollment', async () => {
      const res = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ courseId: createdCourseId, studentId: testStudentId });
      expect(res.statusCode).toBe(409);
    });

    it('admin can list enrollments for a course', async () => {
      const res = await request(app)
        .get(`/api/enrollments?courseId=${createdCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('bulk enroll by roll numbers', async () => {
      const res = await request(app)
        .post('/api/enrollments/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ courseId: createdCourseId, rollNumbers: ['22IT002', '22IT003', 'INVALID999'] });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.enrolled.length).toBe(2);
      expect(res.body.data.errors.length).toBe(1);
    });

    it('admin can remove an enrollment', async () => {
      const res = await request(app)
        .delete(`/api/enrollments/${createdEnrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  // ─── Dashboard ────────────────────────────────────────────────────────────────
  describe('GET /api/dashboard', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toBe(401);
    });

    it('admin gets full dashboard stats', async () => {
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data.stats.users.total).toBeGreaterThan(0);
      expect(typeof res.body.data.stats.departments).toBe('number');
      expect(typeof res.body.data.stats.courses).toBe('number');
    });

    it('coordinator gets coordinator stats', async () => {
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${coordinatorToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.role).toBe('coordinator');
      expect(typeof res.body.data.stats.courses).toBe('number');
    });

    it('faculty gets faculty stats', async () => {
      const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${facultyToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.role).toBe('faculty');
      expect(typeof res.body.data.stats.myCourses).toBe('number');
    });
  });

  // ─── Department cleanup ───────────────────────────────────────────────────────
  describe('Cleanup: delete test department', () => {
    it('admin can delete the test department', async () => {
      const res = await request(app)
        .delete(`/api/departments/${createdDeptId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });
});
