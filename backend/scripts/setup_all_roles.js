const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Department, Programme, Course } = require('../models');

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB:', process.env.MONGODB_URI);

  // 1. Get or create IT Department
  let itDept = await Department.findOne({ code: 'IT' });
  if (!itDept) {
    itDept = await Department.create({
      name: 'Department of Information Technology',
      code: 'IT',
    });
  }

  // 2. Get or create B.Tech IT Programme
  let btechItProg = await Programme.findOne({ code: 'BTECH-IT' });
  if (!btechItProg) {
    btechItProg = await Programme.create({
      name: 'B.Tech Information Technology',
      code: 'BTECH-IT',
      department: itDept._id,
      durationYears: 4,
    });
  }

  // 3. Hash password
  const password = 'Password@123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 4. Upsert jrashi813@gmail.com with ALL 3 ROLES: ['admin', 'coordinator', 'faculty']
  let user = await User.findOne({ email: 'jrashi813@gmail.com' });
  if (user) {
    user.name = 'Rashi Jain';
    user.role = 'coordinator';
    user.roles = ['admin', 'coordinator', 'faculty'];
    user.department = itDept._id;
    user.programme = btechItProg._id;
    user.passwordHash = passwordHash;
    user.isActive = true;
    await user.save();
    console.log('Updated jrashi813@gmail.com with roles:', user.roles);
  } else {
    user = await User.create({
      name: 'Rashi Jain',
      email: 'jrashi813@gmail.com',
      role: 'coordinator',
      roles: ['admin', 'coordinator', 'faculty'],
      department: itDept._id,
      programme: btechItProg._id,
      passwordHash,
      isActive: true,
    });
    console.log('Created jrashi813@gmail.com with roles:', user.roles);
  }

  // Set Programme coordinator to jrashi813@gmail.com
  btechItProg.coordinator = user._id;
  await btechItProg.save();
  console.log('Assigned B.Tech IT Programme coordinator to:', user.email);

  // 5. Ensure Course IT104 has jrashi813@gmail.com as assigned faculty
  let itCourse = await Course.findOne({ code: 'IT104' });
  if (itCourse) {
    itCourse.faculty = user._id;
    itCourse.department = itDept._id;
    itCourse.programme = btechItProg._id;
    if (!itCourse.title && !itCourse.name) {
      itCourse.title = 'Database Management Systems';
      itCourse.name = 'Database Management Systems';
    }
    await itCourse.save();
    console.log('Assigned Course IT104 to Faculty:', user.email);
  } else {
    itCourse = await Course.create({
      name: 'Database Management Systems',
      title: 'Database Management Systems',
      code: 'IT104',
      department: itDept._id,
      programme: btechItProg._id,
      faculty: user._id,
      credits: 4,
      semester: 4,
      academicYear: '2024-2025',
    });
    console.log('Created Course IT104 assigned to:', user.email);
  }

  console.log('\n======================================================');
  console.log('SUCCESS: jrashi813@gmail.com configured with ALL 3 ROLES:');
  console.log('User ID:   ', user._id.toString());
  console.log('Email:     ', user.email);
  console.log('Password:  ', password);
  console.log('Roles:     ', JSON.stringify(user.roles));
  console.log('Active Role:', user.role);
  console.log('Dept:      ', itDept.name);
  console.log('Programme: ', btechItProg.name);
  console.log('Course:     IT104 - Database Management Systems (Assigned Faculty)');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

setup().catch((err) => {
  console.error('Error in setup:', err);
  process.exit(1);
});
