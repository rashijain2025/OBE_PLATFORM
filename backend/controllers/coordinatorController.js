const coordinatorService = require('../services/coordinatorService');

class CoordinatorController {
  async list(req, res, next) {
    try {
      const coordinators = await coordinatorService.listCoordinators();
      res.json({
        success: true,
        data: coordinators,
        message: 'Coordinators retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, email, department, programme } = req.body;
      const result = await coordinatorService.createCoordinator({
        name,
        email,
        department,
        programme,
      });

      res.status(201).json({
        success: true,
        data: result.coordinator,
        warning: result.warning,
        message: 'Coordinator created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { name, email, department, programme, isActive } = req.body;
      const result = await coordinatorService.updateCoordinator(req.params.id, {
        name,
        email,
        department,
        programme,
        isActive,
      });

      res.json({
        success: true,
        data: result.coordinator,
        warning: result.warning,
        message: 'Coordinator updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await coordinatorService.deleteCoordinator(req.params.id);
      res.json({
        success: true,
        data: result,
        message: 'Coordinator deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CoordinatorController();
