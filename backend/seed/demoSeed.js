require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
  COPOMapping,
  COPSOMapping,
} = require('../models');
const baseSeed = require('./seed');

const DEFAULT_PASSWORD = 'Password@123';

const studentNames = [
  'Aarav Sharma', 'Aditi Verma', 'Akash Gupta', 'Ananya Iyer', 'Aryan Patel',
  'Bhavna Joshi', 'Chetan Rao', 'Deepak Nair', 'Divya Menon', 'Gaurav Kulkarni',
  'Harini Sundaram', 'Ishan Malhotra', 'Kavita Reddy', 'Manish Saxena', 'Neha Bhatt',
  'Nikhil Deshmukh', 'Pooja Tiwari', 'Pranav Hegde', 'Priya Nambiar', 'Rahul Mehra',
  'Riya Sen', 'Rohan Kapoor', 'Sanjay Pillai', 'Shreya Mukherjee', 'Siddharth Roy',
  'Sneha Chatterjee', 'Tanvi Singhal', 'Varun Bhatia', 'Vidya Krishnan', 'Yash Chawla'
];

async function seedDemoData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // 1. Run base seed if needed
    console.log('Ensuring base seeds (Departments, Programmes, POs, PSOs, Staff)...');
    await baseSeed();

    // Re-connect since baseSeed calls close
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const itProgramme = await Programme.findOne({ code: 'BTECH-IT' });
    const itDept = await Department.findOne({ code: 'IT' });
    const faculty1 = await User.findOne({ email: 'faculty1@obe.edu' });
    const faculty2 = await User.findOne({ email: 'faculty2@obe.edu' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    // 2. Seed 30 Demo Students
    console.log('Seeding 30 Students...');
    const students = [];
    for (let i = 0; i < studentNames.length; i++) {
      const rollNo = `2024-IT-${String(i + 1).padStart(3, '0')}`;
      const email = `student${i + 1}@obe.edu`;
      const name = studentNames[i];

      const student = await User.findOneAndUpdate(
        { email },
        {
          name,
          email,
          passwordHash,
          role: 'student',
          rollNo,
          department: itDept._id,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      students.push(student);
    }
    console.log(`Seeded ${students.length} students.`);

    // 3. Seed 3 Courses
    console.log('Seeding 3 Demo Courses...');
    const courseDefs = [
      {
        code: 'CS301-DBMS',
        name: 'Database Management Systems',
        semester: 5,
        credits: 4,
        academicYear: '2025-2026',
        faculty: faculty1._id,
        programme: itProgramme._id,
      },
      {
        code: 'CS302-OS',
        name: 'Operating Systems & System Architecture',
        semester: 5,
        credits: 4,
        academicYear: '2025-2026',
        faculty: faculty1._id,
        programme: itProgramme._id,
      },
      {
        code: 'CS401-CN',
        name: 'Computer Networks & Security',
        semester: 6,
        credits: 3,
        academicYear: '2025-2026',
        faculty: faculty2._id,
        programme: itProgramme._id,
      },
    ];

    const courses = [];
    for (const c of courseDefs) {
      const course = await Course.findOneAndUpdate(
        { code: c.code },
        c,
        { upsert: true, new: true }
      );
      courses.push(course);
    }

    // 4. Enroll all 30 students in all 3 courses
    console.log('Enrolling students in demo courses...');
    for (const course of courses) {
      for (const student of students) {
        await CourseEnrollment.findOneAndUpdate(
          { course: course._id, student: student._id },
          { course: course._id, student: student._id, status: 'active' },
          { upsert: true }
        );
      }
    }

    // 5. Seed COs for each course
    console.log('Seeding Course Outcomes...');
    const coMap = {}; // courseId -> [coDoc]
    const coTemplates = [
      { code: 'CO1', statement: 'Understand fundamental theoretical concepts and structures', bloomLevel: 'L2: Understand' },
      { code: 'CO2', statement: 'Apply algorithmic solutions and query schemas to solve problems', bloomLevel: 'L3: Apply' },
      { code: 'CO3', statement: 'Analyze system constraints and design performance optimizations', bloomLevel: 'L4: Analyze' },
      { code: 'CO4', statement: 'Evaluate security and concurrency implications in production environments', bloomLevel: 'L5: Evaluate' },
    ];

    for (const course of courses) {
      coMap[course._id] = [];
      for (const t of coTemplates) {
        const co = await CourseOutcome.findOneAndUpdate(
          { course: course._id, code: t.code },
          {
            course: course._id,
            code: t.code,
            statement: `${t.statement} in ${course.name}`,
            bloomLevel: t.bloomLevel,
            targetMarksPercentage: 60,
            targetAttainmentPercentage: 70,
          },
          { upsert: true, new: true }
        );
        coMap[course._id].push(co);
      }
    }

    // 6. Seed Assessments & Questions for each course
    console.log('Seeding Assessments and Questions...');
    for (const course of courses) {
      const cCOs = coMap[course._id];

      // Assessment 1: Quiz 1 (quiz, 10 marks)
      const quiz1 = await Assessment.findOneAndUpdate(
        { course: course._id, name: 'Quiz 1' },
        { course: course._id, name: 'Quiz 1', type: 'quiz', maxMarks: 10, weightage: 10 },
        { upsert: true, new: true }
      );
      const q_quiz1 = await Question.findOneAndUpdate(
        { assessment: quiz1._id, label: 'Q1' },
        { assessment: quiz1._id, course: course._id, label: 'Q1', maxMarks: 10, co: cCOs[0]._id },
        { upsert: true, new: true }
      );

      // Assessment 2: Assignment 1 (assignment, 10 marks)
      const assign1 = await Assessment.findOneAndUpdate(
        { course: course._id, name: 'Assignment 1' },
        { course: course._id, name: 'Assignment 1', type: 'assignment', maxMarks: 10, weightage: 10 },
        { upsert: true, new: true }
      );
      const q_assign1 = await Question.findOneAndUpdate(
        { assessment: assign1._id, label: 'Q1' },
        { assessment: assign1._id, course: course._id, label: 'Q1', maxMarks: 10, co: cCOs[1]._id },
        { upsert: true, new: true }
      );

      // Assessment 3: Mid-Semester CIE 1 (internal, 30 marks)
      const cie1 = await Assessment.findOneAndUpdate(
        { course: course._id, name: 'Mid-Semester CIE 1' },
        { course: course._id, name: 'Mid-Semester CIE 1', type: 'internal', maxMarks: 30, weightage: 30 },
        { upsert: true, new: true }
      );
      const q_cie1_a = await Question.findOneAndUpdate(
        { assessment: cie1._id, label: 'Q1' },
        { assessment: cie1._id, course: course._id, label: 'Q1', maxMarks: 15, co: cCOs[0]._id },
        { upsert: true, new: true }
      );
      const q_cie1_b = await Question.findOneAndUpdate(
        { assessment: cie1._id, label: 'Q2' },
        { assessment: cie1._id, course: course._id, label: 'Q2', maxMarks: 15, co: cCOs[2]._id },
        { upsert: true, new: true }
      );

      // Assessment 4: End Semester SEE (end_sem, 50 marks)
      const see = await Assessment.findOneAndUpdate(
        { course: course._id, name: 'End-Semester Exam' },
        { course: course._id, name: 'End-Semester Exam', type: 'end_sem', maxMarks: 50, weightage: 50 },
        { upsert: true, new: true }
      );
      const q_see_a = await Question.findOneAndUpdate(
        { assessment: see._id, label: 'Q1' },
        { assessment: see._id, course: course._id, label: 'Q1', maxMarks: 25, co: cCOs[1]._id },
        { upsert: true, new: true }
      );
      const q_see_b = await Question.findOneAndUpdate(
        { assessment: see._id, label: 'Q2' },
        { assessment: see._id, course: course._id, label: 'Q2', maxMarks: 25, co: cCOs[3]._id },
        { upsert: true, new: true }
      );

      // 7. Seed Marks for 30 students with realistic student ability distribution
      console.log(`Seeding marks for ${course.code}...`);
      for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        // Assign students to performance tiers:
        // 0..17: Strong students (ability 75-95%)
        // 18..24: Average students (ability 50-70%)
        // 25..29: At-risk students (ability 25-45%)
        let abilityFactor = 0.82;
        if (sIdx >= 25) {
          abilityFactor = 0.35; // At-risk
        } else if (sIdx >= 18) {
          abilityFactor = 0.60; // Moderate
        }

        const markVal = (max) => Math.min(max, Math.max(0, Math.round(max * (abilityFactor + (Math.random() * 0.2 - 0.1)))));

        const marksPayload = [
          { q: q_quiz1, val: markVal(10), ass: quiz1 },
          { q: q_assign1, val: markVal(10), ass: assign1 },
          { q: q_cie1_a, val: markVal(15), ass: cie1 },
          { q: q_cie1_b, val: markVal(15), ass: cie1 },
          { q: q_see_a, val: markVal(25), ass: see },
          { q: q_see_b, val: markVal(25), ass: see },
        ];

        for (const item of marksPayload) {
          await StudentMarks.findOneAndUpdate(
            { student: student._id, question: item.q._id },
            {
              course: course._id,
              assessment: item.ass._id,
              student: student._id,
              question: item.q._id,
              marksObtained: item.val,
              evaluatedBy: course.faculty,
            },
            { upsert: true }
          );
        }
      }
    }

    // 8. Seed CO-PO and CO-PSO mappings with strength 1/2/3
    console.log('Seeding CO-PO and CO-PSO mappings for Programme...');
    const pos = await PO.find({ programme: itProgramme._id });
    const psos = await PSO.find({ programme: itProgramme._id });

    for (const course of courses) {
      const cCOs = coMap[course._id];
      // Map COs to POs
      for (let i = 0; i < cCOs.length; i++) {
        const coDoc = cCOs[i];
        if (pos[i]) {
          await COPOMapping.findOneAndUpdate(
            { courseOutcome: coDoc._id, programOutcome: pos[i]._id },
            {
              course: course._id,
              courseOutcome: coDoc._id,
              programOutcome: pos[i]._id,
              correlationLevel: ((i % 3) + 1), // 1, 2, or 3
            },
            { upsert: true }
          );
        }
        if (pos[(i + 1) % pos.length]) {
          await COPOMapping.findOneAndUpdate(
            { courseOutcome: coDoc._id, programOutcome: pos[(i + 1) % pos.length]._id },
            {
              course: course._id,
              courseOutcome: coDoc._id,
              programOutcome: pos[(i + 1) % pos.length]._id,
              correlationLevel: (((i + 1) % 3) + 1),
            },
            { upsert: true }
          );
        }

        // Map CO to PSO
        if (psos[i % psos.length]) {
          await COPSOMapping.findOneAndUpdate(
            { courseOutcome: coDoc._id, programSpecificOutcome: psos[i % psos.length]._id },
            {
              course: course._id,
              courseOutcome: coDoc._id,
              programSpecificOutcome: psos[i % psos.length]._id,
              correlationLevel: 3,
            },
            { upsert: true }
          );
        }
      }
    }

    console.log('\n======================================================');
    console.log(' DEMO DATA SEEDED SUCCESSFULLY FOR 3 COURSES & 30 STUDENTS');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Error during demo seeding:', err);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    }
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = seedDemoData;
