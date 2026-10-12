const { Department } = require('../models');

/**
 * Service for Department CRUD
 */
class DepartmentService {
  async listDepartments() {
    return Department.find()
      .populate('headOfDepartment', 'name email role')
      .sort({ name: 1 });
  }

  async getDepartmentById(id) {
    const dept = await Department.findById(id).populate('headOfDepartment', 'name email role');
    if (!dept) {
      const err = new Error('Department not found');
      err.statusCode = 404;
      throw err;
    }
    return dept;
  }

  async createDepartment({ name, code, description, headOfDepartment }) {
    const dept = await Department.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description ? description.trim() : '',
      headOfDepartment: headOfDepartment || null,
    });
    return Department.findById(dept._id).populate('headOfDepartment', 'name email role');
  }

  async updateDepartment(id, { name, code, description, headOfDepartment }) {
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (code !== undefined) update.code = code.toUpperCase().trim();
    if (description !== undefined) update.description = description.trim();
    if (headOfDepartment !== undefined) update.headOfDepartment = headOfDepartment || null;

    const dept = await Department.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('headOfDepartment', 'name email role');

    if (!dept) {
      const err = new Error('Department not found');
      err.statusCode = 404;
      throw err;
    }
    return dept;
  }

  async deleteDepartment(id) {
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) {
      const err = new Error('Department not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true, id };
  }
}

module.exports = new DepartmentService();
