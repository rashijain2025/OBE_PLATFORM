const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Department = require('../models/Department');
const CourseEnrollment = require('../models/CourseEnrollment');
const StudentMarks = require('../models/StudentMarks');

const studentList = [
  { sNo: 79, name: 'LAKSHYA PATOLE', rollNo: 'BTIT24O1079' },
  { sNo: 80, name: 'MANOJ LODHI', rollNo: 'BTIT24O1080' },
  { sNo: 81, name: 'MANSI', rollNo: 'BTIT24O1081' },
  { sNo: 82, name: 'MAYANK NAGAR', rollNo: 'BTIT24O1082' },
  { sNo: 83, name: 'MAYANK SHRIVASTAVA', rollNo: 'BTIT24O1083' },
  { sNo: 84, name: 'MONIL PATIDAR', rollNo: 'BTIT24O1084' },
  { sNo: 85, name: 'NAMAN PAKSHWAR', rollNo: 'BTIT24O1085' },
  { sNo: 86, name: 'NAMAN SHILPKAR', rollNo: 'BTIT24O1086' },
  { sNo: 87, name: 'NAYAN JAIN', rollNo: 'BTIT24O1087' },
  { sNo: 88, name: 'NEERAJ CHHALOTRA', rollNo: 'BTIT24O1088' },
  { sNo: 89, name: 'NEHA PARMAR', rollNo: 'BTIT24O1089' },
  { sNo: 90, name: 'NEHA SHARMA', rollNo: 'BTIT24O1090' },
  { sNo: 91, name: 'NILESH PARMAR', rollNo: 'BTIT24O1091' },
  { sNo: 92, name: 'PANKAJ SAHU', rollNo: 'BTIT24O1092' },
  { sNo: 93, name: 'PIYUSH LILHARE', rollNo: 'BTIT24O1093' },
  { sNo: 94, name: 'PIYUSH MANDLOI', rollNo: 'BTIT24O1094' },
  { sNo: 95, name: 'PRABHANSHU KATRA', rollNo: 'BTIT24O1095' },
  { sNo: 96, name: 'PRACHI RAJPUT', rollNo: 'BTIT24O1096' },
  { sNo: 97, name: 'PRAGYA MADAME', rollNo: 'BTIT24O1097' },
  { sNo: 98, name: 'PRANJAL NAMDEV', rollNo: 'BTIT24O1098' },
  { sNo: 99, name: 'PRASHANT', rollNo: 'BTIT24O1099' },
  { sNo: 100, name: 'PRATHAM SOHANI', rollNo: 'BTIT24O1100' },
  { sNo: 101, name: 'PRATHAM SONI', rollNo: 'BTIT24O1101' },
  { sNo: 102, name: 'PRATIK SONI', rollNo: 'BTIT24O1102' },
  { sNo: 103, name: 'PREET PAWAR', rollNo: 'BTIT24O1103' },
  { sNo: 104, name: 'PRINCE GAUTAM', rollNo: 'BTIT24O1104' },
  { sNo: 105, name: 'PRIYANSHU SOUNDARKAR', rollNo: 'BTIT24O1105' },
  { sNo: 106, name: 'PUNEET RAI', rollNo: 'BTIT24O1106' },
  { sNo: 107, name: 'PUSHPENDRA KORI', rollNo: 'BTIT24O1107' },
  { sNo: 108, name: 'PUSHPENDRA PRATAP', rollNo: 'BTIT24O1108' },
  { sNo: 109, name: 'RADHIKA NAYAK', rollNo: 'BTIT24O1109' },
  { sNo: 110, name: 'RAJ SONI', rollNo: 'BTIT24O1110' },
  { sNo: 111, name: 'RAJJAN SHUKLA', rollNo: 'BTIT24O1111' },
  { sNo: 112, name: 'RASHI JAIN', rollNo: 'BTIT24O1112' },
  { sNo: 113, name: 'RAVINDRA MEHRA', rollNo: 'BTIT24O1113' },
  { sNo: 114, name: 'RISHABH DEV RAI', rollNo: 'BTIT24O1114' },
  { sNo: 115, name: 'RISHABH SAHU', rollNo: 'BTIT24O1115' },
  { sNo: 116, name: 'RISHABH SINGH', rollNo: 'BTIT24O1116' },
  { sNo: 117, name: 'RISHIKA DASHORE', rollNo: 'BTIT24O1117' },
  { sNo: 118, name: 'RISHIT MEHRA', rollNo: 'BTIT24O1118' },
  { sNo: 119, name: 'ROHAN JATAV', rollNo: 'BTIT24O1119' },
  { sNo: 120, name: 'SACHIN KUMAR MEENA', rollNo: 'BTIT24O1120' },
  { sNo: 121, name: 'SAMEER KUMMARIYA', rollNo: 'BTIT24O1121' },
  { sNo: 122, name: 'SAWAN BARETHA', rollNo: 'BTIT24O1122' },
  { sNo: 123, name: 'SHAGUN SHRIVASTAVA', rollNo: 'BTIT24O1123' },
  { sNo: 124, name: 'SHAHID KHAN', rollNo: 'BTIT24O1124' },
  { sNo: 125, name: 'SHASHANK BHADORIYA', rollNo: 'BTIT24O1125' },
  { sNo: 126, name: 'SHASHANK NIGAM', rollNo: 'BTIT24O1126' },
  { sNo: 127, name: 'SHATAKSHI SHARMA', rollNo: 'BTIT24O1127' },
  { sNo: 128, name: 'SHAURYA SHUKLA', rollNo: 'BTIT24O1128' },
];

function toTitleCase(str) {
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find IT department
  let itDept = await Department.findOne({ code: 'IT' });
  if (!itDept) {
    itDept = await Department.findOne({});
  }
  console.log('Target Department:', itDept?.name, itDept?._id);

  // Find existing student IDs
  const oldStudents = await User.find({ role: 'student' }).select('_id');
  const oldStudentIds = oldStudents.map(s => s._id);
  console.log(`Found ${oldStudentIds.length} existing student users to delete.`);

  // Clean up existing student enrollments and marks
  if (oldStudentIds.length > 0) {
    const deletedEnrollments = await CourseEnrollment.deleteMany({ student: { $in: oldStudentIds } });
    console.log(`Deleted ${deletedEnrollments.deletedCount} old course enrollments.`);

    const deletedMarks = await StudentMarks.deleteMany({ student: { $in: oldStudentIds } });
    console.log(`Deleted ${deletedMarks.deletedCount} old student marks.`);

    const deletedUsers = await User.deleteMany({ _id: { $in: oldStudentIds } });
    console.log(`Deleted ${deletedUsers.deletedCount} old student user accounts.`);
  }

  // Create new students
  const newUsers = studentList.map(s => ({
    name: toTitleCase(s.name),
    rollNo: s.rollNo,
    email: `${s.rollNo.toLowerCase()}@student.obe.edu`,
    role: 'student',
    department: itDept?._id || null,
    passwordHash: '$student_record_no_login$',
    isActive: true,
  }));

  const inserted = await User.insertMany(newUsers);
  console.log(`Successfully fed ${inserted.length} new student records into the database!`);

  // Verify
  const totalStudents = await User.countDocuments({ role: 'student' });
  console.log(`Total students now in database: ${totalStudents}`);

  const sample = await User.find({ role: 'student' }).sort({ rollNo: 1 }).limit(5).select('name rollNo email');
  console.log('Sample newly created students:', sample);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error running feed script:', err);
  process.exit(1);
});
