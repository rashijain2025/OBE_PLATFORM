const userService = require('../services/userService');

class UserController {
  async list(req, res, next) {
    try {
      const { role, page, limit } = req.query;
      const result = await userService.listUsers({ role, page: Number(page) || 1, limit: Number(limit) || 50 });
      res.json({ success: true, data: result, message: 'Users retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, data: user, message: 'User retrieved successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, email, role, department, rollNo, isActive } = req.body;
      const user = await userService.updateUser(req.params.id, { name, email, role, department, rollNo, isActive });
      res.json({ success: true, data: user, message: 'User updated successfully' });
    } catch (err) { next(err); }
  }

  async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ success: false, data: null, message: 'newPassword is required' });
      }
      const user = await userService.resetPassword(req.params.id, newPassword);
      res.json({ success: true, data: user, message: 'Password reset successfully' });
    } catch (err) { next(err); }
  }

  async deactivate(req, res, next) {
    try {
      const user = await userService.deactivateUser(req.params.id);
      res.json({ success: true, data: user, message: 'User deactivated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await userService.deleteUser(req.params.id);
      res.json({ success: true, data: result, message: 'User deleted successfully' });
    } catch (err) { next(err); }
  }

  async bulkImportStudents(req, res, next) {
    try {
      const { rollNumbers, departmentId } = req.body;
      const result = await userService.bulkImportStudents({ rollNumbers, departmentId });
      res.status(201).json({
        success: true,
        data: result,
        message: `Imported ${result.createdCount} student records (${result.skippedCount} skipped)`,
      });
    } catch (err) { next(err); }
  }
}

module.exports = new UserController();
