process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User } = require('../models');

describe('Auth & Roles API Tests', () => {
  let adminToken;
  let facultyToken;
  let studentToken;

  beforeAll(async () => {
    // Ensure DB connection is open
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform');
    }

    // Clean up any test user created in previous test runs
    await User.deleteMany({ email: /test.*@obe\.edu/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test.*@obe\.edu/ });
    await mongoose.connection.close();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with valid admin credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@obe.edu',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('admin@obe.edu');
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      adminToken = res.body.data.token;
    });

    it('should successfully log in faculty seeded account', async () => {
      const facRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'faculty1@obe.edu',
          password: 'Password@123',
        });
      expect(facRes.statusCode).toBe(200);
      expect(facRes.body.data.user.role).toBe('faculty');
      facultyToken = facRes.body.data.token;
    });

    it('should reject student account login with 403 Forbidden', async () => {
      const stuRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'aarav.patel@student.obe.edu',
          password: 'Password@123',
        });
      expect(stuRes.statusCode).toBe(403);
      expect(stuRes.body.success).toBe(false);
      expect(stuRes.body.message).toBe('Student accounts cannot log in');
    });

    it('should return 401 when password is wrong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@obe.edu',
          password: 'WrongPassword!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should return 401 when email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@obe.edu',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@obe.edu',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('admin@obe.edu');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when an invalid/malformed token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid token/i);
    });
  });

  describe('Role-Based Authorization & Admin Register', () => {
    it('should return 403 Forbidden when a faculty tries to access admin-only register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          name: 'Test Faculty User',
          email: 'test.facuser@obe.edu',
          password: 'Password@123',
          role: 'faculty',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('should allow Admin to register a new student record without requiring password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test New Student Record',
          email: 'test.stuuser@obe.edu',
          rollNo: '22IT999',
          role: 'student',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test.stuuser@obe.edu');
      expect(res.body.data.role).toBe('student');
      expect(res.body.data.rollNo).toBe('22IT999');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should allow Admin to register a new user successfully (201 Created)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test New Faculty',
          email: 'test.newfaculty@obe.edu',
          password: 'Password@123',
          role: 'faculty',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test.newfaculty@obe.edu');
      expect(res.body.data.role).toBe('faculty');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should return 409 Conflict when attempting to register an existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Admin',
          email: 'admin@obe.edu',
          password: 'Password@123',
          role: 'admin',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('PATCH /api/auth/change-password', () => {
    let changeTestUserToken;

    beforeAll(async () => {
      // Register a dedicated user for password change tests
      await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Password Change User',
          email: 'test.pwduser@obe.edu',
          password: 'Password@123',
          role: 'faculty',
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.pwduser@obe.edu',
          password: 'Password@123',
        });
      changeTestUserToken = loginRes.body.data.token;
    });

    it('should reject change password without authentication (401)', async () => {
      const res = await request(app)
        .patch('/api/auth/change-password')
        .send({
          currentPassword: 'Password@123',
          newPassword: 'NewPassword@456',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject when current password is wrong (401)', async () => {
      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${changeTestUserToken}`)
        .send({
          currentPassword: 'WrongPassword@999',
          newPassword: 'NewPassword@456',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/current password is incorrect/i);
    });

    it('should successfully change password and allow logging in with new password', async () => {
      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${changeTestUserToken}`)
        .send({
          currentPassword: 'Password@123',
          newPassword: 'NewPassword@456',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old password fails
      const failLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.pwduser@obe.edu',
          password: 'Password@123',
        });
      expect(failLogin.statusCode).toBe(401);

      // Verify new password succeeds
      const successLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.pwduser@obe.edu',
          password: 'NewPassword@456',
        });
      expect(successLogin.statusCode).toBe(200);
    });
  });
});

