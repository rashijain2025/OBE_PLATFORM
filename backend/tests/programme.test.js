process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const {
  User,
  Department,
  Programme,
  Course,
  CourseOutcome,
  Assessment,
  Question,
  CourseEnrollment,
  StudentMarks,
  PO,
  PSO,
  PEO,
  COPOMapping,
  COPSOMapping,
} = require('../models');

describe('Phase 6 Coordinator / Programme OBE Tests', () => {
  let coordinatorToken, adminToken, facultyToken;
  let coordinatorUser, otherDeptCoordinatorToken;
  let itProgramme, otherProgramme;
  let itDept, mechDept;
  let handCalcCourse, dummyCourse;
  let co1, co2, co3, co4;
  let po1, po2, po3, po4;
  let pso1, pso2;
  let peo1;
  const testStudents = [];

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    // 1. Log in seeded users
    const [loginAdmin, loginCoord, loginFaculty] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@obe.edu', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'coordinator@obe.edu', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'faculty1@obe.edu', password: 'Password@123' }),
    ]);

    adminToken = loginAdmin.body.data.token;
    coordinatorToken = loginCoord.body.data.token;
    coordinatorUser = loginCoord.body.data.user;
    facultyToken = loginFaculty.body.data.token;

    // 2. Setup Departments and Programmes
    itDept = await Department.findOne({ code: 'IT' });
    if (!itDept) {
      itDept = await Department.create({ name: 'Information Technology', code: 'IT' });
    }

    mechDept = await Department.findOne({ code: 'MECH' });
    if (!mechDept) {
      mechDept = await Department.create({ name: 'Mechanical Engineering', code: 'MECH' });
    }

    itProgramme = await Programme.findOne({ code: 'BTECH-IT' });
    if (!itProgramme) {
      itProgramme = await Programme.create({ name: 'B.Tech IT', code: 'BTECH-IT', department: itDept._id });
    }

    otherProgramme = await Programme.findOne({ code: 'BTECH-ME' });
    if (!otherProgramme) {
      otherProgramme = await Programme.create({ name: 'B.Tech Mechanical', code: 'BTECH-ME', department: mechDept._id });
    }

    // Create a coordinator for Mechanical Dept to test 403 authorization
    let mechCoordinator = await User.findOne({ email: 'mech_coord@obe.edu' });
    if (!mechCoordinator) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Password@123', 10);
      mechCoordinator = await User.create({
        name: 'Dr. Mech Coordinator',
        email: 'mech_coord@obe.edu',
        passwordHash,
        role: 'coordinator',
        department: mechDept._id,
      });
    }
    const loginMechCoord = await request(app).post('/api/auth/login').send({
      email: 'mech_coord@obe.edu',
      password: 'Password@123',
    });
    otherDeptCoordinatorToken = loginMechCoord.body.data.token;

    // 3. Setup Course for Hand Calculation
    await Course.deleteMany({ code: { $in: ['HANDCALC-601', 'DUMMY-602'] } });

    handCalcCourse = await Course.create({
      code: 'HANDCALC-601',
      name: 'Software Engineering & OBE Validation',
      semester: 5,
      programme: itProgramme._id,
      faculty: loginFaculty.body.data.user._id,
      academicYear: '2025-2026',
      credits: 3,
    });

    dummyCourse = await Course.create({
      code: 'DUMMY-602',
      name: 'Mechanical Robotics',
      semester: 7,
      programme: otherProgramme._id,
      faculty: loginFaculty.body.data.user._id,
      academicYear: '2025-2026',
      credits: 3,
    });

    // 4. Setup COs on handCalcCourse
    await CourseOutcome.deleteMany({ course: handCalcCourse._id });
    co1 = await CourseOutcome.create({
      course: handCalcCourse._id,
      code: 'CO1',
      statement: 'Analyze requirements and software design paradigms',
      targetMarksPercentage: 40,
    });
    co2 = await CourseOutcome.create({
      course: handCalcCourse._id,
      code: 'CO2',
      statement: 'Implement scalable architecture patterns',
      targetMarksPercentage: 40,
    });
    co3 = await CourseOutcome.create({
      course: handCalcCourse._id,
      code: 'CO3',
      statement: 'Apply testing methodologies and continuous integration',
      targetMarksPercentage: 40,
    });
    co4 = await CourseOutcome.create({
      course: handCalcCourse._id,
      code: 'CO4',
      statement: 'Unevaluated outcome with no student marks',
      targetMarksPercentage: 40,
    });

    // 5. Setup POs, PSOs, PEOs on itProgramme
    await PO.deleteMany({ programme: itProgramme._id });
    po1 = await PO.create({
      programme: itProgramme._id,
      code: 'PO1',
      title: 'Engineering Knowledge',
      statement: 'Apply mathematical and engineering fundamentals',
    });
    po2 = await PO.create({
      programme: itProgramme._id,
      code: 'PO2',
      title: 'Problem Analysis',
      statement: 'Identify and formulate complex engineering problems',
    });
    po3 = await PO.create({
      programme: itProgramme._id,
      code: 'PO3',
      title: 'Design of Solutions',
      statement: 'Design solutions for complex engineering problems',
    });
    po4 = await PO.create({
      programme: itProgramme._id,
      code: 'PO4',
      title: 'Modern Tool Usage',
      statement: 'Use modern engineering tools',
    });

    await PSO.deleteMany({ programme: itProgramme._id });
    pso1 = await PSO.create({
      programme: itProgramme._id,
      code: 'PSO1',
      statement: 'Develop enterprise software systems using modern frameworks',
    });
    pso2 = await PSO.create({
      programme: itProgramme._id,
      code: 'PSO2',
      statement: 'Implement intelligent algorithms for data analytics',
    });

    await PEO.deleteMany({ programme: itProgramme._id });
    peo1 = await PEO.create({
      programme: itProgramme._id,
      code: 'PEO-I',
      statement: 'Prepare students for successful IT engineering careers',
    });

    // 6. Setup Assessment & Questions on handCalcCourse
    const cie = await Assessment.create({
      name: 'Mid-Term Exam',
      type: 'internal',
      maxMarks: 30,
      weightage: 30,
      course: handCalcCourse._id,
    });

    const q1 = await Question.create({
      assessment: cie._id,
      course: handCalcCourse._id,
      label: 'Q1',
      maxMarks: 10,
      co: co1._id,
    });
    const q2 = await Question.create({
      assessment: cie._id,
      course: handCalcCourse._id,
      label: 'Q2',
      maxMarks: 10,
      co: co2._id,
    });
    const q3 = await Question.create({
      assessment: cie._id,
      course: handCalcCourse._id,
      label: 'Q3',
      maxMarks: 10,
      co: co3._id,
    });
    // Note: co4 has NO questions mapped, so it remains unevaluated!

    // 7. Enroll 10 students
    await CourseEnrollment.deleteMany({ course: handCalcCourse._id });
    const students = await User.find({ role: 'student' }).limit(10);
    for (const st of students) {
      await CourseEnrollment.create({
        course: handCalcCourse._id,
        student: st._id,
        status: 'active',
      });
      testStudents.push(st);
    }

    // 8. Assign deterministic marks so that:
    // - CO1 class attainment = 70.0% (7 of 10 students score >= 40%)
    // - CO2 class attainment = 80.0% (8 of 10 students score >= 40%)
    // - CO3 class attainment = 50.0% (5 of 10 students score >= 40%)
    // - CO4 has NO marks recorded (classAttainment = null)
    await StudentMarks.deleteMany({ course: handCalcCourse._id });
    for (let i = 0; i < 10; i++) {
      const studentId = testStudents[i]._id;
      // Q1 (CO1): first 7 score 8/10 (80% >= 40%), next 3 score 2/10 (20% < 40%) -> 7/10 = 70%
      await StudentMarks.create({
        student: studentId,
        course: handCalcCourse._id,
        assessment: cie._id,
        question: q1._id,
        marksObtained: i < 7 ? 8 : 2,
        evaluatedBy: loginFaculty.body.data.user._id,
      });

      // Q2 (CO2): first 8 score 9/10 (90% >= 40%), next 2 score 1/10 (10% < 40%) -> 8/10 = 80%
      await StudentMarks.create({
        student: studentId,
        course: handCalcCourse._id,
        assessment: cie._id,
        question: q2._id,
        marksObtained: i < 8 ? 9 : 1,
        evaluatedBy: loginFaculty.body.data.user._id,
      });

      // Q3 (CO3): first 5 score 7/10 (70% >= 40%), next 5 score 3/10 (30% < 40%) -> 5/10 = 50%
      await StudentMarks.create({
        student: studentId,
        course: handCalcCourse._id,
        assessment: cie._id,
        question: q3._id,
        marksObtained: i < 5 ? 7 : 3,
        evaluatedBy: loginFaculty.body.data.user._id,
      });
    }

    // Clean up mappings
    await COPOMapping.deleteMany({ course: handCalcCourse._id });
    await COPSOMapping.deleteMany({ course: handCalcCourse._id });
  });

  afterAll(async () => {
    await Course.deleteMany({ code: { $in: ['HANDCALC-601', 'DUMMY-602'] } });
  });

  // TEST 1: Curriculum Management (View/Edit PEOs, POs, PSOs)
  test('1. Coordinator can view and manage PEOs, POs, and PSOs for their programme', async () => {
    // Read all
    const res = await request(app)
      .get(`/api/curriculum?programmeId=${itProgramme._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pos.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.psos.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.peos.length).toBeGreaterThanOrEqual(1);

    // Create a new PO
    const createPoRes = await request(app)
      .post('/api/curriculum/pos')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        programmeId: itProgramme._id,
        code: 'PO99',
        title: 'Test Outcome',
        statement: 'Test statement for verification',
      });
    expect(createPoRes.status).toBe(201);
    expect(createPoRes.body.data.code).toBe('PO99');

    // Update PO
    const updateRes = await request(app)
      .put(`/api/curriculum/pos/${createPoRes.body.data._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ title: 'Updated Test Outcome' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Updated Test Outcome');

    // Delete PO
    const deleteRes = await request(app)
      .delete(`/api/curriculum/pos/${createPoRes.body.data._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });

  // TEST 2: CO-PO and CO-PSO Mapping & Validation
  test('2. Coordinator can map COs to POs/PSOs with strength 1/2/3 and matrix reflects it', async () => {
    // Map CO1 to PO1 (strength 3), CO2 to PO1 (strength 2)
    // Map CO3 to PO2 (strength 1), CO2 to PO2 (strength 3)
    // Map CO4 to PO3 (strength 2) [unevaluated CO]
    // Map CO1 to PSO1 (strength 2)
    const payload = {
      copo: [
        { courseOutcomeId: co1._id, programOutcomeId: po1._id, correlationLevel: 3 },
        { courseOutcomeId: co2._id, programOutcomeId: po1._id, correlationLevel: 2 },
        { courseOutcomeId: co3._id, programOutcomeId: po2._id, correlationLevel: 1 },
        { courseOutcomeId: co2._id, programOutcomeId: po2._id, correlationLevel: 3 },
        { courseOutcomeId: co4._id, programOutcomeId: po3._id, correlationLevel: 2 },
      ],
      copso: [
        { courseOutcomeId: co1._id, programSpecificOutcomeId: pso1._id, correlationLevel: 2 },
      ],
    };

    const saveRes = await request(app)
      .post(`/api/mappings/matrix/${handCalcCourse._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(payload);

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.data.matrix.copo[`${co1._id}_${po1._id}`]).toBe(3);
    expect(saveRes.body.data.matrix.copo[`${co2._id}_${po1._id}`]).toBe(2);
    expect(saveRes.body.data.matrix.copso[`${co1._id}_${pso1._id}`]).toBe(2);
  });

  // TEST 3: Validation: Chain CO -> Course -> Programme check & Duplicate Prevention
  test('3. Rejects invalid mapping chains (cross-course CO or cross-programme PO/PSO)', async () => {
    // Create an foreign CO on dummyCourse
    const foreignCO = await CourseOutcome.create({
      course: dummyCourse._id,
      code: 'CO99',
      statement: 'Foreign outcome',
    });

    // Attempt to map foreign CO to handCalcCourse
    const badCORes = await request(app)
      .post(`/api/mappings/matrix/${handCalcCourse._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        copo: [{ courseOutcomeId: foreignCO._id, programOutcomeId: po1._id, correlationLevel: 2 }],
      });
    expect(badCORes.status).toBe(400);
    expect(badCORes.body.message).toMatch(/does not belong to course/i);

    // Attempt to map foreign PO belonging to otherProgramme to handCalcCourse
    const foreignPO = await PO.create({
      programme: otherProgramme._id,
      code: 'MECH-PO1',
      statement: 'Foreign PO',
    });

    const badPORes = await request(app)
      .post(`/api/mappings/matrix/${handCalcCourse._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        copo: [{ courseOutcomeId: co1._id, programOutcomeId: foreignPO._id, correlationLevel: 2 }],
      });
    expect(badPORes.status).toBe(400);
    expect(badPORes.body.message).toMatch(/does not belong to programme/i);

    // Clean up
    await CourseOutcome.findByIdAndDelete(foreignCO._id);
    await PO.findByIdAndDelete(foreignPO._id);
  });

  // TEST 4: Hand-Calculated Example PO/PSO Attainment
  test('4. Hand-Calculated Example: PO1=74.0%, PO2=72.5%, PO3=Not mapped / No data, PO4=Not mapped / No data, PSO1=70.0%', async () => {
    /**
     * HAND CALCULATION VERIFICATION:
     * - CO1 attainment = 70.0%
     * - CO2 attainment = 80.0%
     * - CO3 attainment = 50.0%
     * - CO4 has NO marks recorded (classAttainment = null)
     *
     * PO1:
     *   CO1 mapped with strength 3 (70.0% * 3 = 210.0)
     *   CO2 mapped with strength 2 (80.0% * 2 = 160.0)
     *   Σ(CO * strength) = 210.0 + 160.0 = 370.0
     *   Σ(strength) = 3 + 2 = 5
     *   Expected PO1 Attainment = 370.0 / 5 = 74.0%
     *
     * PO2:
     *   CO3 mapped with strength 1 (50.0% * 1 = 50.0)
     *   CO2 mapped with strength 3 (80.0% * 3 = 240.0)
     *   Σ(CO * strength) = 50.0 + 240.0 = 290.0
     *   Σ(strength) = 1 + 3 = 4
     *   Expected PO2 Attainment = 290.0 / 4 = 72.5%
     *
     * PO3:
     *   Mapped to CO4 (strength 2), but CO4 has no evaluated marks!
     *   Expected PO3 Attainment = null (status: "Not mapped / No data", NEVER 0%)
     *
     * PO4:
     *   Not mapped to any CO.
     *   Expected PO4 Attainment = null (status: "Not mapped / No data", NEVER 0%)
     *
     * PSO1:
     *   CO1 mapped with strength 2 (70.0% * 2 = 140.0)
     *   Σ(CO * strength) = 140.0
     *   Σ(strength) = 2
     *   Expected PSO1 Attainment = 140.0 / 2 = 70.0%
     *
     * PSO2:
     *   Not mapped.
     *   Expected PSO2 Attainment = null (status: "Not mapped / No data")
     */

    const res = await request(app)
      .get(`/api/programme-attainment/${itProgramme._id}?target=60`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { pos, psos, summary, belowTargetOutcomes } = res.body.data;

    // Verify PO1
    const po1Data = pos.find((p) => p.code === 'PO1');
    expect(po1Data).toBeDefined();
    expect(po1Data.attainment).toBe(74.0);
    expect(po1Data.status).toBe('Attained');
    expect(po1Data.totalStrength).toBe(5);
    expect(po1Data.evaluatedCOsCount).toBe(2);

    // Verify PO2
    const po2Data = pos.find((p) => p.code === 'PO2');
    expect(po2Data).toBeDefined();
    expect(po2Data.attainment).toBe(72.5);
    expect(po2Data.status).toBe('Attained');
    expect(po2Data.totalStrength).toBe(4);
    expect(po2Data.evaluatedCOsCount).toBe(2);

    // Verify PO3 (Mapped to unevaluated CO: NEVER 0%)
    const po3Data = pos.find((p) => p.code === 'PO3');
    expect(po3Data).toBeDefined();
    expect(po3Data.attainment).toBeNull();
    expect(po3Data.status).toBe('Not mapped / No data');

    // Verify PO4 (Unmapped: NEVER 0%)
    const po4Data = pos.find((p) => p.code === 'PO4');
    expect(po4Data).toBeDefined();
    expect(po4Data.attainment).toBeNull();
    expect(po4Data.status).toBe('Not mapped / No data');

    // Verify PSO1
    const pso1Data = psos.find((p) => p.code === 'PSO1');
    expect(pso1Data).toBeDefined();
    expect(pso1Data.attainment).toBe(70.0);
    expect(pso1Data.status).toBe('Attained');
    expect(pso1Data.totalStrength).toBe(2);

    // Verify PSO2
    const pso2Data = psos.find((p) => p.code === 'PSO2');
    expect(pso2Data).toBeDefined();
    expect(pso2Data.attainment).toBeNull();
    expect(pso2Data.status).toBe('Not mapped / No data');

    // Below-target list should be empty with target=60
    expect(belowTargetOutcomes.length).toBe(0);
    expect(summary.pos.evaluated).toBe(2);
    expect(summary.pos.attained).toBe(2);
    expect(summary.pos.notMapped).toBe(2);
  });

  // TEST 5: Target Threshold Override and Below-Target Detection
  test('5. When target is increased to 75%, PO1, PO2, and PSO1 are detected below target with correct gaps', async () => {
    const res = await request(app)
      .get(`/api/programme-attainment/${itProgramme._id}?target=75`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    const { pos, psos, summary, belowTargetOutcomes } = res.body.data;

    const po1Data = pos.find((p) => p.code === 'PO1');
    expect(po1Data.attainment).toBe(74.0);
    expect(po1Data.status).toBe('Below Target');
    expect(po1Data.gap).toBe(1.0); // 75.0 - 74.0

    const po2Data = pos.find((p) => p.code === 'PO2');
    expect(po2Data.attainment).toBe(60.0);
    expect(po2Data.status).toBe('Below Target');
    expect(po2Data.gap).toBe(15.0); // 75.0 - 60.0 (CO3 drops to 0% at 75% target)

    const pso1Data = psos.find((p) => p.code === 'PSO1');
    expect(pso1Data.attainment).toBe(70.0);
    expect(pso1Data.status).toBe('Below Target');
    expect(pso1Data.gap).toBe(5.0); // 75.0 - 70.0

    // Summary below-target counts
    expect(summary.pos.belowTarget).toBe(2);
    expect(summary.psos.belowTarget).toBe(1);
    expect(belowTargetOutcomes.length).toBe(3);
  });

  // TEST 6: CSV Export Generation
  test('6. CSV Export streams valid text/csv format with PO and PSO data', async () => {
    const res = await request(app)
      .get(`/api/programme-attainment/export-csv/${itProgramme._id}?target=60`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('PROGRAMME ATTAINMENT REPORT');
    expect(res.text).toContain('PO1');
    expect(res.text).toContain('74');
    expect(res.text).toContain('PO2');
    expect(res.text).toContain('72.5');
    expect(res.text).toContain('PSO1');
    expect(res.text).toContain('70');
  });

  // TEST 7: Security: Department Isolation and Token Authentication
  test('7. Unauthorized department coordinator receives 403; unauthenticated receives 401', async () => {
    // Mechanical coordinator trying to access IT programme
    const forbiddenRes = await request(app)
      .get(`/api/programme-attainment/${itProgramme._id}`)
      .set('Authorization', `Bearer ${otherDeptCoordinatorToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.message).toMatch(/Forbidden/i);

    // No token
    const unauthRes = await request(app).get(`/api/programme-attainment/${itProgramme._id}`);
    expect(unauthRes.status).toBe(401);
  });

  // TEST 8: PO Deletion Guard: Block deletion if mapped to course outcomes
  test('8. Prevents deleting a PO that is referenced in active CO-PO mappings', async () => {
    // po1 is mapped in test 2
    const res = await request(app)
      .delete(`/api/curriculum/pos/${po1._id}`)
      .set('Authorization', `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/mapping\(s\) reference it/i);
  });
});
