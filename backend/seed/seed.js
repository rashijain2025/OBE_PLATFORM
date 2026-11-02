require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User,
  Department,
  Programme,
  PEO,
  PO,
  PSO,
} = require('../models');

const DEFAULT_PASSWORD = 'Password@123';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/obe_platform';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // 1. Department
    console.log('Seeding Department...');
    let itDept = await Department.findOne({ code: 'IT' });
    if (!itDept) {
      itDept = await Department.create({
        name: 'Department of Information Technology',
        code: 'IT',
        description: 'Department focused on software systems, data engineering, and modern computing.',
      });
      console.log('Created Department: Information Technology (IT)');
    } else {
      console.log('Department IT already exists.');
    }

    // 2. Programme
    console.log('Seeding Programme...');
    let itProgramme = await Programme.findOne({ code: 'BTECH-IT' });
    if (!itProgramme) {
      itProgramme = await Programme.create({
        name: 'B.Tech Information Technology',
        code: 'BTECH-IT',
        department: itDept._id,
        durationYears: 4,
        level: 'UG',
      });
      console.log('Created Programme: B.Tech Information Technology');
    } else {
      console.log('Programme BTECH-IT already exists.');
    }

    // Hash password for demo users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    // Coordinator (1 demo user, no hardcoded admin credentials)
    console.log('Seeding OBE Coordinator...');
    const coordinatorEmail = (process.env.DEMO_COORDINATOR_EMAIL || 'coordinator@mitsgwalior.in').toLowerCase().trim();
    const coordinator = await User.findOneAndUpdate(
      { email: coordinatorEmail },
      {
        name: 'Dr. Ramesh Sharma (OBE Coordinator)',
        email: coordinatorEmail,
        passwordHash,
        role: 'coordinator',
        department: itDept._id,
        programme: itProgramme._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    itDept.headOfDepartment = coordinator._id;
    await itDept.save();
    itProgramme.coordinator = coordinator._id;
    await itProgramme.save();
    console.log(`Coordinator seeded: ${coordinatorEmail}`);

    // Seed one pending demo invitation
    const { Invitation } = require('../models');
    await Invitation.findOneAndUpdate(
      { email: 'demo.faculty@mitsgwalior.in', department: itDept._id },
      {
        email: 'demo.faculty@mitsgwalior.in',
        department: itDept._id,
        programme: itProgramme._id,
        invitedBy: coordinator._id,
        status: 'pending',
        lastSentAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log('Demo pending invitation seeded: demo.faculty@mitsgwalior.in');

    // 5. Faculty (2 users)
    console.log('Seeding Faculty...');
    const faculties = [
      {
        name: 'Prof. Rajesh Kumar',
        email: 'faculty1@obe.edu',
        role: 'faculty',
        department: itDept._id,
      },
      {
        name: 'Prof. Anita Verma',
        email: 'faculty2@obe.edu',
        role: 'faculty',
        department: itDept._id,
      },
    ];

    for (const f of faculties) {
      await User.findOneAndUpdate(
        { email: f.email },
        {
          name: f.name,
          email: f.email,
          passwordHash,
          role: f.role,
          department: f.department,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      console.log(`Faculty seeded: ${f.email}`);
    }

    // 6. Students (~10 users)
    console.log('Seeding Students...');
    const studentsData = [
      { name: 'Aarav Patel', rollNo: '22IT001', email: 'aarav.patel@student.obe.edu' },
      { name: 'Diya Sharma', rollNo: '22IT002', email: 'diya.sharma@student.obe.edu' },
      { name: 'Ishaan Gupta', rollNo: '22IT003', email: 'ishaan.gupta@student.obe.edu' },
      { name: 'Ananya Iyer', rollNo: '22IT004', email: 'ananya.iyer@student.obe.edu' },
      { name: 'Rohan Verma', rollNo: '22IT005', email: 'rohan.verma@student.obe.edu' },
      { name: 'Sneha Nair', rollNo: '22IT006', email: 'sneha.nair@student.obe.edu' },
      { name: 'Aditya Joshi', rollNo: '22IT007', email: 'aditya.joshi@student.obe.edu' },
      { name: 'Kavya Reddy', rollNo: '22IT008', email: 'kavya.reddy@student.obe.edu' },
      { name: 'Vikram Malhotra', rollNo: '22IT009', email: 'vikram.malhotra@student.obe.edu' },
      { name: 'Pooja Choudhury', rollNo: '22IT010', email: 'pooja.choudhury@student.obe.edu' },
    ];

    for (const s of studentsData) {
      await User.findOneAndUpdate(
        { email: s.email },
        {
          name: s.name,
          email: s.email,
          rollNo: s.rollNo,
          passwordHash,
          role: 'student',
          department: itDept._id,
          isActive: true,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${studentsData.length} students.`);

    // 7. Official PEO-I..III
    console.log('Seeding PEOs...');
    const peos = [
      {
        code: 'PEO-I',
        statement:
          'Core Competence: To prepare students with strong foundation in mathematical, scientific and engineering fundamentals necessary to formulate, analyze and solve hardware and software problems and to prepare them for successful career in IT and allied industries.',
      },
      {
        code: 'PEO-II',
        statement:
          'Professionalism and Lifelong Learning: To prepare students to succeed in higher education, research, and adapt to emerging cutting-edge technologies through self-directed, lifelong learning.',
      },
      {
        code: 'PEO-III',
        statement:
          'Ethics, Leadership and Social Responsibility: To inculcate professional ethics, leadership qualities, communication skills, teamwork, and social sensitivity to address real-world challenges.',
      },
    ];

    for (const p of peos) {
      await PEO.findOneAndUpdate(
        { programme: itProgramme._id, code: p.code },
        { programme: itProgramme._id, code: p.code, statement: p.statement },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${peos.length} official PEOs.`);

    // 8. Official PO1..PO12 (NBA Graduate Attributes / Washington Accord)
    console.log('Seeding POs...');
    const pos = [
      {
        code: 'PO1',
        title: 'Engineering Knowledge',
        statement:
          'Engineering knowledge: Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.',
      },
      {
        code: 'PO2',
        title: 'Problem Analysis',
        statement:
          'Problem analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.',
      },
      {
        code: 'PO3',
        title: 'Design/Development of Solutions',
        statement:
          'Design/development of solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations.',
      },
      {
        code: 'PO4',
        title: 'Conduct Investigations of Complex Problems',
        statement:
          'Conduct investigations of complex problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.',
      },
      {
        code: 'PO5',
        title: 'Modern Tool Usage',
        statement:
          'Modern tool usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations.',
      },
      {
        code: 'PO6',
        title: 'The Engineer and Society',
        statement:
          'The engineer and society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice.',
      },
      {
        code: 'PO7',
        title: 'Environment and Sustainability',
        statement:
          'Environment and sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.',
      },
      {
        code: 'PO8',
        title: 'Ethics',
        statement:
          'Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.',
      },
      {
        code: 'PO9',
        title: 'Individual and Team Work',
        statement:
          'Individual and team work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.',
      },
      {
        code: 'PO10',
        title: 'Communication',
        statement:
          'Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.',
      },
      {
        code: 'PO11',
        title: 'Project Management and Finance',
        statement:
          'Project management and finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to one\'s own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.',
      },
      {
        code: 'PO12',
        title: 'Life-long Learning',
        statement:
          'Life-long learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.',
      },
    ];

    for (const po of pos) {
      await PO.findOneAndUpdate(
        { programme: itProgramme._id, code: po.code },
        { programme: itProgramme._id, code: po.code, title: po.title, statement: po.statement },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${pos.length} official POs.`);

    // 9. Official PSO-1..2
    console.log('Seeding PSOs...');
    const psos = [
      {
        code: 'PSO-1',
        statement:
          'Software System Design: Analyze, design, implement, and test software systems and algorithms tailored for modern web, cloud, and data-centric environments.',
      },
      {
        code: 'PSO-2',
        statement:
          'Applied Information Technology: Apply networking, database, cybersecurity, and intelligent computing solutions to solve complex domain-specific problems.',
      },
    ];

    for (const pso of psos) {
      await PSO.findOneAndUpdate(
        { programme: itProgramme._id, code: pso.code },
        { programme: itProgramme._id, code: pso.code, statement: pso.statement },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${psos.length} official PSOs.`);

    console.log('\n==========================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
