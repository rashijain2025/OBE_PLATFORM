process.env.NODE_ENV = 'test';
process.env.ALLOWED_EMAIL_DOMAIN = 'mitsgwalior.in';
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
process.env.ADMIN_EMAIL = 'admin.env@mitsgwalior.in';
process.env.ADMIN_PASSWORD = 'SecureAdminPassword123!';
process.env.ENABLE_PASSWORD_LOGIN = 'true';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'user@test.com';
process.env.SMTP_PASS = 'pass@test';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Mock google-auth-library
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
          if (idToken === 'invalid-token' || idToken === 'expired-token') {
            throw new Error('Invalid or expired Google token');
          }
          try {
            const parsed = JSON.parse(idToken);
            return {
              getPayload: () => parsed,
            };
          } catch (e) {
            throw new Error('Invalid token payload');
          }
        }),
      };
    }),
  };
});

// Mock nodemailer
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockImplementation(async (mailOptions) => {
        if (mailOptions.to && mailOptions.to.includes('fail-smtp')) {
          throw new Error('SMTP connection failed');
        }
        return { messageId: 'mock-mail-id' };
      }),
    }),
  };
});

const app = require('../server');
const { initAdminFromEnv } = require('../utils/initAdmin');
const { User, Department, Programme, Course, Invitation } = require('../models');

describe('Google Auth, Admin From Env, & Coordinator-Faculty Invite Flow', () => {
  let adminUser;
  let adminToken;
  let deptA;
  let deptB;
  let progA;
  let progB;
  let coordAUser;
  let coordAToken;
  let coordBUser;
  let coordBToken;
  let courseA1;
  let courseA2;
  let courseB1;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform');
    }

    // Clean test records
    await User.deleteMany({ email: /.*@mitsgwalior\.in|.*@evil.*|.*@gmail\.com/ });
    await Invitation.deleteMany({});
    await Department.deleteMany({ code: { $in: ['TEST_IT', 'TEST_EC'] } });
    await Programme.deleteMany({ code: { $in: ['PROG_IT', 'PROG_EC'] } });
    await Course.deleteMany({ code: { $in: ['CS101', 'CS102', 'EC101'] } });

    // Seed departments
    deptA = await Department.create({ name: 'IT Dept', code: 'TEST_IT' });
    deptB = await Department.create({ name: 'EC Dept', code: 'TEST_EC' });

    // Seed programmes
    progA = await Programme.create({
      name: 'B.Tech IT',
      code: 'PROG_IT',
      department: deptA._id,
      durationYears: 4,
      level: 'UG',
    });
    progB = await Programme.create({
      name: 'B.Tech EC',
      code: 'PROG_EC',
      department: deptB._id,
      durationYears: 4,
      level: 'UG',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /.*@mitsgwalior\.in|.*@evil.*|.*@gmail\.com/ });
    await Invitation.deleteMany({});
    await Department.deleteMany({ code: { $in: ['TEST_IT', 'TEST_EC'] } });
    await Programme.deleteMany({ code: { $in: ['PROG_IT', 'PROG_EC'] } });
    await Course.deleteMany({ code: { $in: ['CS101', 'CS102', 'EC101'] } });
    await mongoose.connection.close();
  });

  // Helper to format mock Google ID Token
  const makeToken = (payload) => JSON.stringify(payload);

  describe('1. Admin Upsert from ENV & Password Login', () => {
    it('creates admin user with hashed password from env', async () => {
      adminUser = await initAdminFromEnv();
      expect(adminUser).toBeDefined();
      expect(adminUser.email).toBe('admin.env@mitsgwalior.in');
      expect(adminUser.role).toBe('admin');

      const dbUser = await User.findById(adminUser._id);
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(process.env.ADMIN_PASSWORD);
      const isMatch = await bcrypt.compare(process.env.ADMIN_PASSWORD, dbUser.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('admin password login works and returns token without sensitive fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.env@mitsgwalior.in',
          password: 'SecureAdminPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.googleId).toBeUndefined();
      adminToken = res.body.data.token;
    });

    it('admin via Google -> 403 Forbidden', async () => {
      const token = makeToken({
        email: 'admin.env@mitsgwalior.in',
        email_verified: true,
        sub: 'google-sub-admin-123',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin accounts cannot log in via google/i);
    });

    it('short/missing ADMIN_PASSWORD -> no admin created', async () => {
      const savedPass = process.env.ADMIN_PASSWORD;
      process.env.ADMIN_PASSWORD = 'short';
      const resultShort = await initAdminFromEnv();
      expect(resultShort).toBeNull();

      delete process.env.ADMIN_PASSWORD;
      const resultMissing = await initAdminFromEnv();
      expect(resultMissing).toBeNull();

      process.env.ADMIN_PASSWORD = savedPass;
    });
  });

  describe('2. Admin Adds Coordinator & Coordinator Google Login', () => {
    it('admin adds coordinator to progA', async () => {
      const res = await request(app)
        .post('/api/coordinators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prof. Sharma',
          email: 'sharma@mitsgwalior.in',
          department: deptA._id,
          programme: progA._id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('coordinator');
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.googleId).toBeUndefined();

      // Check programme coordinator was updated
      const updatedProg = await Programme.findById(progA._id);
      expect(String(updatedProg.coordinator)).toBe(String(res.body.data._id));
      coordAUser = res.body.data;
    });

    it('does not allow assigning one programme to two coordinators', async () => {
      const res = await request(app)
        .post('/api/coordinators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prof. Verma',
          email: 'verma@mitsgwalior.in',
          department: deptA._id,
          programme: progA._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already has an assigned coordinator/i);
    });

    it('coordinator logs in via Google and gets coordinator role', async () => {
      const token = makeToken({
        email: 'sharma@mitsgwalior.in',
        email_verified: true,
        sub: 'google-sub-sharma-123',
        name: 'Prof. Sharma',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('coordinator');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.googleId).toBeUndefined();
      coordAToken = res.body.data.token;
    });

    it('unregistered @mitsgwalior.in without invite -> 403 and no user created', async () => {
      const token = makeToken({
        email: 'unregistered@mitsgwalior.in',
        email_verified: true,
        sub: 'google-sub-unregistered',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/no invitation for this email/i);

      const user = await User.findOne({ email: 'unregistered@mitsgwalior.in' });
      expect(user).toBeNull();
    });
  });

  describe('3. Coordinator Invites Faculty (Per-email results)', () => {
    beforeAll(async () => {
      // Create coordinator for Dept B
      const coordBRes = await request(app)
        .post('/api/coordinators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prof. Gupta EC',
          email: 'gupta@mitsgwalior.in',
          department: deptB._id,
          programme: progB._id,
        });
      coordBUser = coordBRes.body.data;

      const coordBLogin = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: makeToken({
            email: 'gupta@mitsgwalior.in',
            email_verified: true,
            sub: 'google-sub-gupta-123',
          }),
        });
      coordBToken = coordBLogin.body.data.token;
    });

    it('coordinator invites multiple emails and returns correct status for each', async () => {
      const res = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({
          emails: [
            'faculty.new1@mitsgwalior.in',
            'faculty.new2@mitsgwalior.in',
            'invalid-email-format',
            'outsider@gmail.com',
            'sharma@mitsgwalior.in', // already active
          ],
        });

      expect(res.status).toBe(201);
      const { results } = res.body.data;
      expect(results).toHaveLength(5);

      const new1 = results.find((r) => r.email === 'faculty.new1@mitsgwalior.in');
      expect(new1.status).toBe('created');
      expect(new1.mailSent).toBe(true);

      const new2 = results.find((r) => r.email === 'faculty.new2@mitsgwalior.in');
      expect(new2.status).toBe('created');

      const invalid = results.find((r) => r.email === 'invalid-email-format');
      expect(invalid.status).toBe('invalid');

      const wrongDomain = results.find((r) => r.email === 'outsider@gmail.com');
      expect(wrongDomain.status).toBe('domain_rejected');

      const alreadyActive = results.find((r) => r.email === 'sharma@mitsgwalior.in');
      expect(alreadyActive.status).toBe('already_active');
    });

    it('detects already_invited on duplicate invite submission', async () => {
      const res = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({
          emails: ['faculty.new1@mitsgwalior.in'],
        });

      expect(res.status).toBe(201);
      const duplicate = res.body.data.results[0];
      expect(duplicate.status).toBe('already_invited');
    });

    it('SMTP failure -> invite still saved with mailSent false', async () => {
      const res = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({
          emails: ['fail-smtp.faculty@mitsgwalior.in'],
        });

      expect(res.status).toBe(201);
      const result = res.body.data.results[0];
      expect(result.status).toBe('created');
      expect(result.mailSent).toBe(false);

      const savedInvite = await Invitation.findOne({ email: 'fail-smtp.faculty@mitsgwalior.in' });
      expect(savedInvite).toBeDefined();
      expect(savedInvite.status).toBe('pending');
    });
  });

  describe('4. Scoping & Authorization for Invitations & Courses', () => {
    let inviteDeptA;

    beforeAll(async () => {
      inviteDeptA = await Invitation.findOne({ email: 'faculty.new1@mitsgwalior.in' });
    });

    it('coordinator cannot see another departments invites', async () => {
      const res = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${coordBToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((inv) => String(inv._id));
      expect(ids).not.toContain(String(inviteDeptA._id));
    });

    it('coordinator cannot resend another departments invite (403)', async () => {
      const res = await request(app)
        .post(`/api/invitations/${inviteDeptA._id}/resend`)
        .set('Authorization', `Bearer ${coordBToken}`);

      expect(res.status).toBe(403);
    });

    it('coordinator cannot revoke another departments invite (403)', async () => {
      const res = await request(app)
        .delete(`/api/invitations/${inviteDeptA._id}`)
        .set('Authorization', `Bearer ${coordBToken}`);

      expect(res.status).toBe(403);
    });

    it('faculty cannot access invitation routes (403)', async () => {
      // First let faculty.new1 log in
      const facLogin = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: makeToken({
            email: 'faculty.new1@mitsgwalior.in',
            email_verified: true,
            sub: 'google-sub-fac-new1',
            name: 'Prof. Faculty One',
          }),
        });

      const facToken = facLogin.body.data.token;

      const res = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${facToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('5. Invited Faculty Google Login, Course Assignment & Revocation', () => {
    let facUser;
    let facToken;

    beforeAll(async () => {
      // Seed courses
      courseA1 = await Course.create({
        code: 'CS101',
        name: 'Data Structures',
        semester: 3,
        programme: progA._id,
        faculty: coordAUser._id, // temporarily assigned to coord
        academicYear: '2025-2026',
      });
      courseA2 = await Course.create({
        code: 'CS102',
        name: 'Algorithms',
        semester: 4,
        programme: progA._id,
        faculty: coordAUser._id,
        academicYear: '2025-2026',
      });
      courseB1 = await Course.create({
        code: 'EC101',
        name: 'Signals & Systems',
        semester: 3,
        programme: progB._id,
        faculty: coordBUser._id,
        academicYear: '2025-2026',
      });
    });

    it('invited email via Google -> faculty user created, invite accepted, JWT works', async () => {
      const token = makeToken({
        email: 'faculty.new2@mitsgwalior.in',
        email_verified: true,
        sub: 'google-sub-fac-new2',
        name: 'Dr. Jane Faculty',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('faculty');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.googleId).toBeUndefined();

      facUser = res.body.data.user;
      facToken = res.body.data.token;

      // Verify invite status is now accepted
      const invite = await Invitation.findOne({ email: 'faculty.new2@mitsgwalior.in' });
      expect(invite.status).toBe('accepted');
      expect(invite.acceptedAt).toBeDefined();

      // JWT works on protected faculty route
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${facToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe('faculty.new2@mitsgwalior.in');
    });

    it('coordinator assigns programme courses to their faculty member', async () => {
      const res = await request(app)
        .post(`/api/faculty/${facUser._id}/assign-courses`)
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({
          courseIds: [courseA1._id, courseA2._id],
        });

      expect(res.status).toBe(200);

      // Verify course assignments
      const c1 = await Course.findById(courseA1._id);
      expect(String(c1.faculty)).toBe(String(facUser._id));
    });

    it('coordinator cannot assign courses belonging to another programme', async () => {
      const res = await request(app)
        .post(`/api/faculty/${facUser._id}/assign-courses`)
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({
          courseIds: [courseB1._id],
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/faculty returns faculty in own dept with assigned courses count', async () => {
      const res = await request(app)
        .get('/api/faculty')
        .set('Authorization', `Bearer ${coordAToken}`);

      expect(res.status).toBe(200);
      const target = res.body.data.find((f) => f.email === 'faculty.new2@mitsgwalior.in');
      expect(target).toBeDefined();
      expect(target.coursesAssigned).toBeGreaterThanOrEqual(1);
    });

    it('revoking accepted faculty with assigned courses returns clear error', async () => {
      const invite = await Invitation.findOne({ email: 'faculty.new2@mitsgwalior.in' });
      const res = await request(app)
        .delete(`/api/invitations/${invite._id}`)
        .set('Authorization', `Bearer ${coordAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/reassign or unassign their courses first/i);
    });

    it('revoking invite without assigned courses deactivates faculty user', async () => {
      // Create and accept another faculty invite without courses
      await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${coordAToken}`)
        .send({ emails: ['faculty.no.courses@mitsgwalior.in'] });

      await request(app)
        .post('/api/auth/google')
        .send({
          idToken: makeToken({
            email: 'faculty.no.courses@mitsgwalior.in',
            email_verified: true,
            sub: 'sub-no-course',
          }),
        });

      const invite = await Invitation.findOne({ email: 'faculty.no.courses@mitsgwalior.in' });
      const res = await request(app)
        .delete(`/api/invitations/${invite._id}`)
        .set('Authorization', `Bearer ${coordAToken}`);

      expect(res.status).toBe(200);

      const user = await User.findOne({ email: 'faculty.no.courses@mitsgwalior.in' });
      expect(user.isActive).toBe(false);

      // Login attempt with revoked invite/deactivated user -> 403
      const loginRes = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: makeToken({
            email: 'faculty.no.courses@mitsgwalior.in',
            email_verified: true,
            sub: 'sub-no-course',
          }),
        });
      expect(loginRes.status).toBe(403);
    });
  });

  describe('6. Edge Cases & Attack Domain Rejections', () => {
    it('rejects look-alike domain x@mitsgwalior.in.evil.com', async () => {
      const token = makeToken({
        email: 'user@mitsgwalior.in.evil.com',
        email_verified: true,
        sub: 'evil-sub-1',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
    });

    it('rejects look-alike domain x@evilmitsgwalior.in', async () => {
      const token = makeToken({
        email: 'user@evilmitsgwalior.in',
        email_verified: true,
        sub: 'evil-sub-2',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
    });

    it('rejects email_verified === false', async () => {
      const token = makeToken({
        email: 'unverified@mitsgwalior.in',
        email_verified: false,
        sub: 'unverified-sub',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(401);
    });

    it('rejects invalid or expired token', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('rejects googleId mismatch on existing profile', async () => {
      // Coordinator sharma already bound sub 'google-sub-sharma-123'
      const token = makeToken({
        email: 'sharma@mitsgwalior.in',
        email_verified: true,
        sub: 'different-fake-sub',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/mismatch/i);
    });

    it('rejects student record login attempt via Google', async () => {
      await User.create({
        name: 'Student Record',
        email: 'student.rec@mitsgwalior.in',
        role: 'student',
        department: deptA._id,
        passwordHash: '$student_record_no_login$',
      });

      const token = makeToken({
        email: 'student.rec@mitsgwalior.in',
        email_verified: true,
        sub: 'sub-student',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: token });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/student/i);
    });
  });

  describe('7. ENABLE_PASSWORD_LOGIN Control', () => {
    it('blocks non-admin password login when ENABLE_PASSWORD_LOGIN=false', async () => {
      process.env.ENABLE_PASSWORD_LOGIN = 'false';

      // Seed faculty with password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Password@123', salt);
      await User.findOneAndUpdate(
        { email: 'faculty.pw@mitsgwalior.in' },
        {
          name: 'Faculty PW',
          email: 'faculty.pw@mitsgwalior.in',
          passwordHash: hash,
          role: 'faculty',
          department: deptA._id,
          isActive: true,
        },
        { upsert: true }
      );

      const facRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'faculty.pw@mitsgwalior.in',
          password: 'Password@123',
        });

      expect(facRes.status).toBe(403);
      expect(facRes.body.message).toMatch(/password login is disabled/i);

      // But Admin CAN STILL log in with password
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.env@mitsgwalior.in',
          password: 'SecureAdminPassword123!',
        });

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);

      process.env.ENABLE_PASSWORD_LOGIN = 'true';
    });
  });
});
