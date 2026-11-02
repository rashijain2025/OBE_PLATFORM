const { User, Programme, Department } = require('../models');

/**
 * Service to manage Coordinators (Admin-only)
 */
class CoordinatorService {
  /**
   * List all coordinators with department & programme details
   */
  async listCoordinators() {
    const coordinators = await User.find({ role: 'coordinator' })
      .populate('department', 'name code')
      .populate('programme', 'name code')
      .select('-passwordHash -googleId')
      .sort({ createdAt: -1 });

    // Also populate any programmes that have coordinator set to this user
    const progMap = {};
    const programmes = await Programme.find({ coordinator: { $ne: null } })
      .select('name code coordinator department');
    programmes.forEach((p) => {
      progMap[String(p.coordinator)] = p;
    });

    return coordinators.map((c) => {
      const cObj = c.toObject();
      if (!cObj.programme && progMap[String(c._id)]) {
        cObj.programme = progMap[String(c._id)];
      }
      return cObj;
    });
  }

  /**
   * Create or register a coordinator
   * @param {Object} data - { name, email, department, programme }
   */
  async createCoordinator({ name, email, department, programme }) {
    if (!name || !email || !department || !programme) {
      const err = new Error('Name, email, department and programme are required');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAIN || 'mitsgwalior.in')
      .toLowerCase()
      .split(',')
      .map((d) => d.trim().replace(/^@/, ''));

    let warning = null;
    if (!allowedDomains.some((d) => normalizedEmail.endsWith(`@${d}`))) {
      warning = `Email domain does not match official @${allowedDomains.join(', @')} domain. Google login may fail unless domain matches.`;
    }

    // Check programme exists
    const prog = await Programme.findById(programme);
    if (!prog) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }

    // Do not allow assigning one programme to two coordinators
    if (prog.coordinator) {
      const existingCoord = await User.findById(prog.coordinator);
      if (existingCoord && existingCoord.email !== normalizedEmail) {
        const err = new Error(`Programme '${prog.name}' already has an assigned coordinator (${existingCoord.name} - ${existingCoord.email})`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (user.role === 'admin') {
        const err = new Error('Cannot assign coordinator role to an admin user');
        err.statusCode = 400;
        throw err;
      }
      user.name = name.trim();
      user.role = 'coordinator';
      user.roles = ['coordinator', 'faculty'];
      user.department = department;
      user.programme = programme;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        role: 'coordinator',
        roles: ['coordinator', 'faculty'],
        department,
        programme,
        passwordHash: null,
        isActive: true,
      });
    }

    // Assign coordinator to programme
    prog.coordinator = user._id;
    await prog.save();

    const populatedUser = await User.findById(user._id)
      .populate('department', 'name code')
      .populate('programme', 'name code')
      .select('-passwordHash -googleId');

    return {
      coordinator: populatedUser,
      warning,
    };
  }

  /**
   * Update an existing coordinator
   */
  async updateCoordinator(id, { name, email, department, programme, isActive }) {
    const user = await User.findById(id);
    if (!user || user.role !== 'coordinator') {
      const err = new Error('Coordinator not found');
      err.statusCode = 404;
      throw err;
    }

    let warning = null;
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || 'mitsgwalior.in').toLowerCase().trim();
      if (!normalizedEmail.endsWith(`@${allowedDomain}`)) {
        warning = `Email domain does not match official @${allowedDomain} domain.`;
      }
      user.email = normalizedEmail;
    }

    if (name) user.name = name.trim();
    if (department) user.department = department;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    if (programme && String(programme) !== String(user.programme)) {
      // Check target programme
      const newProg = await Programme.findById(programme);
      if (!newProg) {
        const err = new Error('Programme not found');
        err.statusCode = 404;
        throw err;
      }

      if (newProg.coordinator && String(newProg.coordinator) !== String(user._id)) {
        const otherCoord = await User.findById(newProg.coordinator);
        const err = new Error(`Programme '${newProg.name}' is already assigned to coordinator: ${otherCoord ? otherCoord.name : newProg.coordinator}`);
        err.statusCode = 400;
        throw err;
      }

      // Unassign old programme coordinator
      await Programme.updateMany({ coordinator: user._id }, { $set: { coordinator: null } });

      newProg.coordinator = user._id;
      await newProg.save();
      user.programme = programme;
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('department', 'name code')
      .populate('programme', 'name code')
      .select('-passwordHash -googleId');

    return {
      coordinator: updatedUser,
      warning,
    };
  }

  /**
   * Delete or remove coordinator
   */
  async deleteCoordinator(id) {
    const user = await User.findById(id);
    if (!user || user.role !== 'coordinator') {
      const err = new Error('Coordinator not found');
      err.statusCode = 404;
      throw err;
    }

    // Unassign from any programmes
    await Programme.updateMany({ coordinator: user._id }, { $set: { coordinator: null } });

    await User.findByIdAndDelete(id);

    return { message: 'Coordinator removed successfully' };
  }
}

module.exports = new CoordinatorService();
