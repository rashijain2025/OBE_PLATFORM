const bcrypt = require('bcryptjs');
const { User } = require('../models');

/**
 * Upsert admin user from environment variables on server start
 * @returns {Promise<Object|null>}
 */
async function initAdminFromEnv() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL) {
    return null;
  }

  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.warn(
      '[Admin Init] ADMIN_PASSWORD is missing or shorter than 12 characters. Skipping admin creation.'
    );
    return null;
  }

  const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
  const existingAdmin = await User.findOne({ email: normalizedEmail });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // Preserve existing roles if user has multiple roles or if it's jrashi813@gmail.com
  let adminRoles = ['admin'];
  if (normalizedEmail === 'jrashi813@gmail.com') {
    adminRoles = ['admin', 'coordinator', 'faculty'];
  } else if (existingAdmin && Array.isArray(existingAdmin.roles) && existingAdmin.roles.length > 0) {
    adminRoles = Array.from(new Set([...existingAdmin.roles, 'admin']));
  }

  const adminUser = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name: existingAdmin?.name && existingAdmin.name !== 'System Administrator'
          ? existingAdmin.name
          : (ADMIN_NAME || 'System Administrator').trim(),
        email: normalizedEmail,
        passwordHash,
        roles: adminRoles,
        isActive: true,
      },
      $setOnInsert: {
        role: 'admin',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('-passwordHash -googleId');

  // Always ensure jrashi813@gmail.com has all 3 roles: admin, coordinator, faculty
  const rashi = await User.findOne({ email: 'jrashi813@gmail.com' });
  if (rashi) {
    const rolesSet = new Set(rashi.roles || []);
    rolesSet.add('admin');
    rolesSet.add('coordinator');
    rolesSet.add('faculty');
    rashi.roles = Array.from(rolesSet);
    await rashi.save();
    console.log(`[Admin Init] Ensured jrashi813@gmail.com roles: [${rashi.roles.join(', ')}]`);
  }

  console.log(`[Admin Init] Admin user configured: ${normalizedEmail} with roles: [${adminRoles.join(', ')}]`);
  return adminUser;
}

module.exports = { initAdminFromEnv };
