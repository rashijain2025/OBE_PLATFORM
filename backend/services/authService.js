const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { User, Invitation } = require('../models');
const { generateToken } = require('../utils/jwt');

/**
 * Service to handle user authentication
 */
class AuthService {
  /**
   * Authenticate a user with email and password
   * @param {Object} credentials - { email, password }
   * @returns {Object} { user, token }
   */
  async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Please provide both email and password');
      error.statusCode = 400;
      throw error;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).populate('department', 'name code');

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (user.role === 'student') {
      const error = new Error('Student accounts cannot log in');
      error.statusCode = 403;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is inactive. Please contact your administrator.');
      error.statusCode = 403;
      throw error;
    }

    // Check if password login is disabled for non-admin accounts
    const enablePasswordLogin = process.env.ENABLE_PASSWORD_LOGIN !== 'false';
    if (user.role !== 'admin' && !enablePasswordLogin) {
      const error = new Error('Password login is disabled for non-admin accounts. Please sign in with Google.');
      error.statusCode = 403;
      throw error;
    }

    if (!user.passwordHash) {
      const error = new Error('Password login is not available for this account. Please sign in with Google.');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
      email: user.email,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.googleId;

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Authenticate a user with a Google ID token
   * @param {Object} params - { idToken }
   * @returns {Object} { user, token }
   */
  async googleLogin({ idToken }) {
    if (!idToken) {
      const error = new Error('Google ID token is required');
      error.statusCode = 400;
      throw error;
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      const error = new Error('Invalid or expired Google token');
      error.statusCode = 401;
      throw error;
    }

    if (!payload || !payload.email_verified) {
      const error = new Error('Google email is not verified');
      error.statusCode = 401;
      throw error;
    }

    const email = (payload.email || '').toLowerCase().trim();
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAIN || 'mitsgwalior.in')
      .toLowerCase()
      .split(',')
      .map((d) => d.trim().replace(/^@/, ''));

    // Exact domain match: reject look-alikes like x@mitsgwalior.in.evil.com or x@evilmitsgwalior.in
    const emailParts = email.split('@');
    if (emailParts.length !== 2 || !allowedDomains.includes(emailParts[1].toLowerCase())) {
      const error = new Error(`Only official accounts (@${allowedDomains.join(', @')}) are allowed`);
      error.statusCode = 403;
      throw error;
    }

    // Check hd claim if present
    if (payload.hd && !allowedDomains.includes(payload.hd.toLowerCase())) {
      const error = new Error(`Invalid Google hosted domain: @${payload.hd}`);
      error.statusCode = 403;
      throw error;
    }

    // Admin can NEVER log in via Google unless multi-role staff or user granted multi-role
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (adminEmail && email === adminEmail && email !== 'jrashi813@gmail.com') {
      const error = new Error('Admin accounts cannot log in via Google. Please use email and password.');
      error.statusCode = 403;
      throw error;
    }

    let user = await User.findOne({ email })
      .populate('department', 'name code')
      .populate('programme', 'name code');

    if (user) {
      const hasOtherStaffRoles = user.roles && (user.roles.includes('coordinator') || user.roles.includes('faculty'));
      if (user.role === 'admin' && !hasOtherStaffRoles && email !== 'jrashi813@gmail.com') {
        const error = new Error('Admin accounts cannot log in via Google. Please use email and password.');
        error.statusCode = 403;
        throw error;
      }

      if (user.role === 'student') {
        const error = new Error('Student records cannot log in');
        error.statusCode = 403;
        throw error;
      }

      if (!user.isActive) {
        const error = new Error('Account is inactive. Please contact your administrator.');
        error.statusCode = 403;
        throw error;
      }

      // Check stored googleId
      if (user.googleId && user.googleId !== payload.sub) {
        const error = new Error('Google account mismatch with registered identity');
        error.statusCode = 403;
        throw error;
      }

      if (!user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      // User does not exist — check pending invitation
      const pendingInvite = await Invitation.findOne({ email, status: 'pending' });
      if (!pendingInvite) {
        const revokedInvite = await Invitation.findOne({ email, status: 'revoked' });
        if (revokedInvite) {
          const error = new Error('Your invitation has been revoked. Ask your coordinator.');
          error.statusCode = 403;
          throw error;
        }
        const error = new Error('No invitation for this email. Ask your coordinator.');
        error.statusCode = 403;
        throw error;
      }

      // Create faculty user from invitation
      user = await User.create({
        name: (payload.name || emailParts[0]).trim(),
        email,
        googleId: payload.sub,
        role: 'faculty',
        department: pendingInvite.department,
        programme: pendingInvite.programme,
        passwordHash: null,
        isActive: true,
      });

      pendingInvite.status = 'accepted';
      pendingInvite.acceptedAt = new Date();
      await pendingInvite.save();

      user = await User.findById(user._id)
        .populate('department', 'name code')
        .populate('programme', 'name code');
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
      email: user.email,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.googleId;

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Register a new user or student record (Admin-only action)
   * @param {Object} userData - { name, email, password, role, department, rollNo }
   * @returns {Object} Created user without passwordHash
   */
  async register({ name, email, password, role = 'faculty', department, rollNo }) {
    if (!name || !email) {
      const error = new Error('Name and email are required');
      error.statusCode = 400;
      throw error;
    }

    const assignedRole = role || 'faculty';

    if (assignedRole !== 'student') {
      if (!password) {
        const error = new Error('Password is required');
        error.statusCode = 400;
        throw error;
      }
      if (password.length < 6) {
        const error = new Error('Password must be at least 6 characters');
        error.statusCode = 400;
        throw error;
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error('User already exists with this email address');
      error.statusCode = 409;
      throw error;
    }

    let passwordHash = '$student_record_no_login$';
    if (assignedRole !== 'student') {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      department: department || null,
      rollNo: rollNo ? rollNo.trim() : null,
      isActive: true,
    });

    const populatedUser = await User.findById(user._id)
      .populate('department', 'name code')
      .select('-passwordHash -googleId');

    return populatedUser;
  }

  /**
   * Get profile of currently authenticated user
   * @param {string} userId - User ID from token
   * @returns {Object} User without passwordHash or googleId
   */
  async getMe(userId) {
    const user = await User.findById(userId)
      .populate('department', 'name code')
      .select('-passwordHash -googleId');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }
  /**
   * Change password for authenticated user
   * @param {string} userId - User ID from token
   * @param {Object} passwords - { currentPassword, newPassword }
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required');
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return { message: 'Password changed successfully' };
  }

  /**
   * Switch the active view role for multi-role users
   * @param {string} userId - User ID
   * @param {string} targetRole - 'admin' | 'coordinator' | 'faculty'
   * @returns {Object} { user, token }
   */
  async switchRole(userId, targetRole) {
    if (!targetRole) {
      const error = new Error('Target role is required');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId)
      .populate('department', 'name code')
      .populate('programme', 'name code');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const availableRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    if (!availableRoles.includes(targetRole)) {
      const error = new Error(`Cannot switch to role '${targetRole}'. Permitted roles: [${availableRoles.join(', ')}]`);
      error.statusCode = 403;
      throw error;
    }

    user.role = targetRole;
    await user.save();

    const token = generateToken({
      id: user._id,
      role: user.role,
      roles: user.roles,
      email: user.email,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    delete userObj.googleId;

    return {
      user: userObj,
      token,
    };
  }
}

module.exports = new AuthService();
