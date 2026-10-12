const bcrypt = require('bcryptjs');
const { User } = require('../models');
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

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
      .select('-passwordHash');

    return populatedUser;
  }

  /**
   * Get profile of currently authenticated user
   * @param {string} userId - User ID from token
   * @returns {Object} User without passwordHash
   */
  async getMe(userId) {
    const user = await User.findById(userId)
      .populate('department', 'name code')
      .select('-passwordHash');

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
}

module.exports = new AuthService();
