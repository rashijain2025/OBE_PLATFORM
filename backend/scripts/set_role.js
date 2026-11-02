const mongoose = require('mongoose');
require('dotenv').config();
const { User, Programme } = require('../models');

const email = process.argv[2] || 'jrashi813@gmail.com';
const newRole = process.argv[3];

if (!newRole || !['admin', 'coordinator', 'faculty'].includes(newRole)) {
  console.log('Usage: node scripts/set_role.js <email> <admin|coordinator|faculty>');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`User with email "${email}" not found.`);
    process.exit(1);
  }

  user.role = newRole;
  await user.save();
  console.log(`Successfully updated ${email} role to: ${newRole}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
