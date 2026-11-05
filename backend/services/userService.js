const { User, Programme } = require('../models');

/**
 * Service for admin user management (CRUD + password reset)
 */
class UserService {
  /**
   * Programme the user may manage class lists for; coordinators are limited to their department
   */
  async resolveManagedProgramme(programmeId, user) {
    const programme = await Programme.findById(programmeId).select('name code department');
    if (!programme) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role === 'coordinator') {
      const ownDept = user.department?._id || user.department;
      if (!ownDept || String(programme.department) !== String(ownDept)) {
        const err = new Error('Forbidden: This programme is outside your school / centre');
        err.statusCode = 403;
        throw err;
      }
    }
    return programme;
  }

  /**
   * Class lists (programme + batch + section) with student counts
   */
  async listClassLists(user) {
    const programmeFilter = {};
    if (user.role === 'coordinator') {
      programmeFilter.department = user.department?._id || user.department || null;
    }
    const programmes = await Programme.find(programmeFilter).select('name code');
    const programmeById = new Map(programmes.map((p) => [String(p._id), p]));

    const groups = await User.aggregate([
      {
        $match: {
          role: 'student',
          isActive: true,
          programme: { $in: programmes.map((p) => p._id) },
          batch: { $ne: null },
          section: { $ne: null },
        },
      },
      { $group: { _id: { programme: '$programme', batch: '$batch', section: '$section' }, count: { $sum: 1 } } },
      { $sort: { '_id.batch': -1, '_id.section': 1 } },
    ]);

    return groups.map((g) => {
      const p = programmeById.get(String(g._id.programme));
      return {
        programme: { _id: p._id, name: p.name, code: p.code },
        batch: g._id.batch,
        section: g._id.section,
        count: g.count,
      };
    });
  }

  async listClassStudents({ programmeId, batch, section }, user) {
    await this.resolveManagedProgramme(programmeId, user);
    return User.find({ role: 'student', isActive: true, programme: programmeId, batch, section: String(section).toUpperCase() })
      .select('name email rollNo batch section')
      .sort({ rollNo: 1 });
  }

  /**
   * Upload a class list: creates new student records and updates existing ones (matched by roll number)
   * students: [{ rollNo, name, email? }]
   */
  async uploadClassList({ programmeId, batch, section, students }, user) {
    const programme = await this.resolveManagedProgramme(programmeId, user);
    const cleanBatch = String(batch || '').trim();
    const cleanSection = String(section || '').trim().toUpperCase();
    if (!cleanBatch || !cleanSection) {
      const err = new Error('Batch and section are required');
      err.statusCode = 400;
      throw err;
    }
    if (!Array.isArray(students) || students.length === 0) {
      const err = new Error('The class list has no students');
      err.statusCode = 400;
      throw err;
    }

    const result = { created: 0, updated: 0, skipped: [] };
    const seenRolls = new Set();

    for (const [index, row] of students.entries()) {
      const rollNo = String(row.rollNo || '').trim().toUpperCase();
      const name = String(row.name || '').trim();
      if (!rollNo) {
        result.skipped.push({ row: index + 1, rollNo: '', reason: 'Missing roll number' });
        continue;
      }
      if (seenRolls.has(rollNo)) {
        result.skipped.push({ row: index + 1, rollNo, reason: 'Duplicate roll number in this list' });
        continue;
      }
      seenRolls.add(rollNo);

      const classFields = {
        programme: programme._id,
        department: programme.department,
        batch: cleanBatch,
        section: cleanSection,
        isActive: true,
      };

      const existing = await User.findOne({ rollNo: { $regex: `^${rollNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      if (existing) {
        if (existing.role !== 'student') {
          result.skipped.push({ row: index + 1, rollNo, reason: 'Roll number belongs to a staff account' });
          continue;
        }
        Object.assign(existing, classFields);
        if (name) existing.name = name;
        await existing.save();
        result.updated++;
        continue;
      }

      const email = String(row.email || '').trim().toLowerCase() || `${rollNo.toLowerCase()}@student.obe.edu`;
      if (await User.exists({ email })) {
        result.skipped.push({ row: index + 1, rollNo, reason: `Email ${email} is already used by another record` });
        continue;
      }

      await User.create({
        ...classFields,
        name: name || `Student ${rollNo}`,
        email,
        rollNo,
        role: 'student',
        passwordHash: '$student_record_no_login$',
      });
      result.created++;
    }

    return result;
  }

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
