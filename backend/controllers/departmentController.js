const departmentService = require('../services/departmentService');

class DepartmentController {
  async list(req, res, next) {
    try {
      const depts = await departmentService.listDepartments();
      res.json({ success: true, data: depts, message: 'Schools / Centres retrieved successfully' });
    } catch (err) { next(err); }
  }

  async catalog(req, res, next) {
    try {
      const data = await departmentService.getCatalog();
      res.json({ success: true, data, message: 'Schools / Centres list retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const dept = await departmentService.getDepartmentById(req.params.id);
      res.json({ success: true, data: dept, message: 'School / Centre retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { name, code, description, headOfDepartment } = req.body;
      if (!name || !code) {
        return res.status(400).json({ success: false, data: null, message: 'name and code are required' });
      }
      const dept = await departmentService.createDepartment({ name, code, description, headOfDepartment });
      res.status(201).json({ success: true, data: dept, message: 'School / Centre created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, code, description, headOfDepartment } = req.body;
      const dept = await departmentService.updateDepartment(req.params.id, { name, code, description, headOfDepartment });
      res.json({ success: true, data: dept, message: 'School / Centre updated successfully' });
    } catch (err) { next(err); }
  }

  async getObeTargets(req, res, next) {
    try {
      const data = await departmentService.getObeTargets(req.params.id);
      res.json({ success: true, data, message: 'School / Centre OBE targets retrieved successfully' });
    } catch (err) { next(err); }
  }

  async updateObeTargets(req, res, next) {
    try {
      const { targetMarksPercentage, targetAttainmentPercentage, applyToExisting } = req.body;
      const data = await departmentService.updateObeTargets(
        req.params.id,
        { targetMarksPercentage, targetAttainmentPercentage, applyToExisting: Boolean(applyToExisting) },
        req.user
      );
      res.json({ success: true, data, message: 'School / Centre OBE targets updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(req.params.id);
      res.json({ success: true, data: result, message: 'School / Centre deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new DepartmentController();
