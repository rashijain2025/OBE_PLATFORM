const departmentService = require('../services/departmentService');

class DepartmentController {
  async list(req, res, next) {
    try {
      const depts = await departmentService.listDepartments();
      res.json({ success: true, data: depts, message: 'Departments retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const dept = await departmentService.getDepartmentById(req.params.id);
      res.json({ success: true, data: dept, message: 'Department retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { name, code, description, headOfDepartment } = req.body;
      if (!name || !code) {
        return res.status(400).json({ success: false, data: null, message: 'name and code are required' });
      }
      const dept = await departmentService.createDepartment({ name, code, description, headOfDepartment });
      res.status(201).json({ success: true, data: dept, message: 'Department created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, code, description, headOfDepartment } = req.body;
      const dept = await departmentService.updateDepartment(req.params.id, { name, code, description, headOfDepartment });
      res.json({ success: true, data: dept, message: 'Department updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(req.params.id);
      res.json({ success: true, data: result, message: 'Department deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new DepartmentController();
