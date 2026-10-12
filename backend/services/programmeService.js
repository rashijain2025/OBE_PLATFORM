const { Programme } = require('../models');

/**
 * Service for Programme CRUD
 */
class ProgrammeService {
  async listProgrammes() {
    return Programme.find()
      .populate('department', 'name code')
      .sort({ name: 1 });
  }

  async getProgrammeById(id) {
    const prog = await Programme.findById(id).populate('department', 'name code');
    if (!prog) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }
    return prog;
  }

  async createProgramme({ name, code, department, durationYears, level }) {
    const prog = await Programme.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      department,
      durationYears: durationYears || 4,
      level: level || 'UG',
    });
    return Programme.findById(prog._id).populate('department', 'name code');
  }

  async updateProgramme(id, { name, code, department, durationYears, level }) {
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (code !== undefined) update.code = code.toUpperCase().trim();
    if (department !== undefined) update.department = department;
    if (durationYears !== undefined) update.durationYears = durationYears;
    if (level !== undefined) update.level = level;

    const prog = await Programme.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('department', 'name code');

    if (!prog) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }
    return prog;
  }

  async deleteProgramme(id) {
    const prog = await Programme.findByIdAndDelete(id);
    if (!prog) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true, id };
  }
}

module.exports = new ProgrammeService();
