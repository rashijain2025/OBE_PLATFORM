const { Department, Programme, Course, CourseOutcome } = require('../models');

const SCHOOLS_CENTRES = require('../config/schoolsCentres');

const DEFAULT_OBE_TARGETS = { targetMarksPercentage: 60, targetAttainmentPercentage: 70 };

/**
 * Service for Department CRUD
 */
class DepartmentService {
  /**
   * The fixed list, with which entries already exist
   */
  async getCatalog() {
    const existing = await Department.find().select('name code');
    const byName = new Map(existing.map((d) => [d.name, d]));
    return SCHOOLS_CENTRES.map(({ name, code }) => ({
      name,
      code,
      existingId: byName.get(name)?._id || null,
    }));
  }

  assertNameInCatalog(name) {
    if (!SCHOOLS_CENTRES.some((s) => s.name === name)) {
      const err = new Error('Please choose a School / Centre from the list');
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Department a course belongs to (course → programme → department)
   */
  async getCourseDepartmentId(courseId) {
    const course = await Course.findById(courseId).select('programme');
    if (!course) return null;
    const programme = await Programme.findById(course.programme).select('department');
    return programme?.department || null;
  }

  /**
   * Targets every new CO in this course starts with
   */
  async getTargetsForCourse(courseId) {
    const departmentId = await this.getCourseDepartmentId(courseId);
    if (!departmentId) return { ...DEFAULT_OBE_TARGETS };
    const dept = await Department.findById(departmentId).select('obeTargets');
    return {
      targetMarksPercentage: dept?.obeTargets?.targetMarksPercentage ?? DEFAULT_OBE_TARGETS.targetMarksPercentage,
      targetAttainmentPercentage:
        dept?.obeTargets?.targetAttainmentPercentage ?? DEFAULT_OBE_TARGETS.targetAttainmentPercentage,
    };
  }

  /**
   * Coordinators may only manage their own department; admins manage any
   */
  assertCanManageDepartment(departmentId, user) {
    if (user.role === 'admin') return;
    const ownDept = user.department?._id || user.department;
    if (!ownDept || String(ownDept) !== String(departmentId)) {
      const err = new Error('Forbidden: You can only manage your own school / centre');
      err.statusCode = 403;
      throw err;
    }
  }

  async getObeTargets(departmentId) {
    const dept = await Department.findById(departmentId).select('name code obeTargets');
    if (!dept) {
      const err = new Error('School / Centre not found');
      err.statusCode = 404;
      throw err;
    }
    return {
      department: { _id: dept._id, name: dept.name, code: dept.code },
      targetMarksPercentage: dept.obeTargets?.targetMarksPercentage ?? DEFAULT_OBE_TARGETS.targetMarksPercentage,
      targetAttainmentPercentage:
        dept.obeTargets?.targetAttainmentPercentage ?? DEFAULT_OBE_TARGETS.targetAttainmentPercentage,
    };
  }

  /**
   * Update department targets; optionally push them onto every existing CO in the department
   */
  async updateObeTargets(departmentId, { targetMarksPercentage, targetAttainmentPercentage, applyToExisting }, user) {
    this.assertCanManageDepartment(departmentId, user);

    const marks = Number(targetMarksPercentage);
    const attainment = Number(targetAttainmentPercentage);
    for (const [label, val] of [['Target Marks %', marks], ['Attainment Goal %', attainment]]) {
      if (!Number.isFinite(val) || val < 0 || val > 100) {
        const err = new Error(`${label} must be a number between 0 and 100`);
        err.statusCode = 400;
        throw err;
      }
    }

    const dept = await Department.findByIdAndUpdate(
      departmentId,
      { obeTargets: { targetMarksPercentage: marks, targetAttainmentPercentage: attainment } },
      { new: true, runValidators: true }
    );
    if (!dept) {
      const err = new Error('School / Centre not found');
      err.statusCode = 404;
      throw err;
    }

    let updatedCOs = 0;
    if (applyToExisting) {
      const programmeIds = await Programme.find({ department: departmentId }).distinct('_id');
      const courseIds = await Course.find({ programme: { $in: programmeIds } }).distinct('_id');
      const result = await CourseOutcome.updateMany(
        { course: { $in: courseIds } },
        { targetMarksPercentage: marks, targetAttainmentPercentage: attainment }
      );
      updatedCOs = result.modifiedCount;
    }

    return { ...(await this.getObeTargets(departmentId)), updatedCOs };
  }

  async listDepartments() {
    return Department.find()
      .populate('headOfDepartment', 'name email role')
      .sort({ name: 1 });
  }

  async getDepartmentById(id) {
    const dept = await Department.findById(id).populate('headOfDepartment', 'name email role');
    if (!dept) {
      const err = new Error('School / Centre not found');
      err.statusCode = 404;
      throw err;
    }
    return dept;
  }

  async createDepartment({ name, code, description, headOfDepartment }) {
    this.assertNameInCatalog(name.trim());
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
    if (name !== undefined) {
      this.assertNameInCatalog(name.trim());
      update.name = name.trim();
    }
    if (code !== undefined) update.code = code.toUpperCase().trim();
    if (description !== undefined) update.description = description.trim();
    if (headOfDepartment !== undefined) update.headOfDepartment = headOfDepartment || null;

    const dept = await Department.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('headOfDepartment', 'name email role');

    if (!dept) {
      const err = new Error('School / Centre not found');
      err.statusCode = 404;
      throw err;
    }
    return dept;
  }

  async deleteDepartment(id) {
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) {
      const err = new Error('School / Centre not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true, id };
  }
}

module.exports = new DepartmentService();
