const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to Atlas:', uri ? uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'none');
  await mongoose.connect(uri);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  const itDept = await mongoose.connection.db.collection('departments').findOne({ code: 'IT' });
  const btechProg = await mongoose.connection.db.collection('programmes').findOne({ code: 'BTECH-IT' });

  const result = await mongoose.connection.db.collection('users').findOneAndUpdate(
    { email: 'jrashi813@gmail.com' },
    {
      $set: {
        name: 'Rashi Jain',
        role: 'coordinator',
        roles: ['admin', 'coordinator', 'faculty'],
        passwordHash,
        isActive: true,
        department: itDept ? itDept._id : null,
        programme: btechProg ? btechProg._id : null,
      },
    },
    { returnDocument: 'after', upsert: true }
  );

  // Link programme coordinator
  if (btechProg && result) {
    await mongoose.connection.db.collection('programmes').updateOne(
      { _id: btechProg._id },
      { $set: { coordinator: result._id } }
    );
  }

  // Link Course IT104 assigned faculty
  await mongoose.connection.db.collection('courses').updateOne(
    { code: 'IT104' },
    {
      $set: {
        faculty: result._id,
        name: 'Database Management Systems',
        title: 'Database Management Systems',
      },
    },
    { upsert: true }
  );

  console.log('SUCCESS! Updated jrashi813@gmail.com in Atlas:');
  console.log('Email:      ', result.email);
  console.log('Roles:      ', result.roles);
  console.log('Active Role:', result.role);
  console.log('Password:    Password@123');
  console.log('Course:      IT104 (Assigned Faculty)');
  console.log('Programme:   B.Tech IT (Assigned Coordinator)');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
