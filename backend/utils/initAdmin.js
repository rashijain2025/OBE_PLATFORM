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
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const adminUser = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name: (ADMIN_NAME || 'System Administrator').trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
        roles: ['admin'],
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('-passwordHash -googleId');

  console.log(`[Admin Init] Admin user configured: ${normalizedEmail}`);
  return adminUser;
}

module.exports = { initAdminFromEnv };
