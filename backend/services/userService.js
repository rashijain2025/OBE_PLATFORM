const { User } = require('../models');

/**
 * Service for admin user management (CRUD + password reset)
 */
class UserService {
  /**
   * List all users, optionally filtered by role
   */
  async listUsers({ role, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (role) filter.role = role;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .populate('department', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Get a single user by ID
   */
  async getUserById(id) {
    const user = await User.findById(id)
      .select('-passwordHash')
      .populate('department', 'name code');

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  /**
   * Update user profile fields (not password)
   */
  async updateUser(id, { name, email, role, department, rollNo, isActive }) {
    // Check email uniqueness if being changed
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existing) {
        const err = new Error('Email already in use by another user');
        err.statusCode = 409;
        throw err;
      }
    }

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (email !== undefined) update.email = email.toLowerCase().trim();
    if (role !== undefined) update.role = role;
    if (department !== undefined) update.department = department || null;
    if (rollNo !== undefined) update.rollNo = rollNo ? rollNo.trim() : null;
    if (isActive !== undefined) update.isActive = isActive;

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('-passwordHash')
      .populate('department', 'name code');

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  /**
   * Admin resets a user's password
   */
  async resetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters');
      err.statusCode = 400;
      throw err;
    }

    const existing = await User.findById(id);
    if (!existing) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (existing.role === 'student') {
      const err = new Error('Student accounts cannot log in; passwords cannot be set for student records');
      err.statusCode = 400;
      throw err;
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    existing.passwordHash = passwordHash;
    await existing.save();

    const user = existing.toObject();
    delete user.passwordHash;
    return user;
  }

  /**
   * Bulk import student records by roll number
   */
  async bulkImportStudents({ rollNumbers, departmentId } = {}) {
    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      const err = new Error('rollNumbers array is required and must not be empty');
      err.statusCode = 400;
      throw err;
    }

    const created = [];
    const skipped = [];

    for (const item of rollNumbers) {
      const roll = (typeof item === 'string' ? item : item.rollNo)?.trim();
      if (!roll) continue;

      const name = (typeof item === 'object' && item.name?.trim()) ? item.name.trim() : `Student ${roll}`;
      const email = (typeof item === 'object' && item.email?.trim()) ? item.email.toLowerCase().trim() : `${roll.toLowerCase()}@student.obe.edu`;
      const dept = (typeof item === 'object' && item.department) ? item.department : (departmentId || null);

      const existing = await User.findOne({
        $or: [{ rollNo: roll }, { email }],
      });

      if (existing) {
        skipped.push({ rollNo: roll, reason: 'Roll number or email already exists' });
        continue;
      }

      const newStudent = await User.create({
        name,
        email,
        rollNo: roll,
        role: 'student',
        department: dept,
        passwordHash: '$student_record_no_login$',
        isActive: true,
      });

      created.push({
        _id: newStudent._id,
        name: newStudent.name,
        rollNo: newStudent.rollNo,
        email: newStudent.email,
      });
    }

    return {
      totalProcessed: rollNumbers.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    };
  }

  /**
   * Deactivate (soft-delete) a user
   */
  async deactivateUser(id) {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  /**
   * Permanently delete a user
   */
  async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true, id };
  }
}

module.exports = new UserService();
