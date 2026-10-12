const curriculumService = require('../services/curriculumService');

class CurriculumController {
  async getCurriculum(req, res, next) {
    try {
      const { programmeId } = req.query;
      if (!programmeId) {
        return res.status(400).json({ success: false, message: 'programmeId query parameter is required' });
      }
      const data = await curriculumService.getCurriculumOutcomes(programmeId, req.user);
      return res.status(200).json({ success: true, data, message: 'Curriculum outcomes fetched successfully' });
    } catch (err) {
      next(err);
    }
  }

  // PEO
  async createPEO(req, res, next) {
    try {
      const data = await curriculumService.createPEO(req.body, req.user);
      return res.status(201).json({ success: true, data, message: 'PEO created successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updatePEO(req, res, next) {
    try {
      const data = await curriculumService.updatePEO(req.params.id, req.body, req.user);
      return res.status(200).json({ success: true, data, message: 'PEO updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async deletePEO(req, res, next) {
    try {
      const data = await curriculumService.deletePEO(req.params.id, req.user);
      return res.status(200).json({ success: true, data, message: 'PEO deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // PO
  async createPO(req, res, next) {
    try {
      const data = await curriculumService.createPO(req.body, req.user);
      return res.status(201).json({ success: true, data, message: 'PO created successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updatePO(req, res, next) {
    try {
      const data = await curriculumService.updatePO(req.params.id, req.body, req.user);
      return res.status(200).json({ success: true, data, message: 'PO updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async deletePO(req, res, next) {
    try {
      const data = await curriculumService.deletePO(req.params.id, req.user);
      return res.status(200).json({ success: true, data, message: 'PO deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // PSO
  async createPSO(req, res, next) {
    try {
      const data = await curriculumService.createPSO(req.body, req.user);
      return res.status(201).json({ success: true, data, message: 'PSO created successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updatePSO(req, res, next) {
    try {
      const data = await curriculumService.updatePSO(req.params.id, req.body, req.user);
      return res.status(200).json({ success: true, data, message: 'PSO updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async deletePSO(req, res, next) {
    try {
      const data = await curriculumService.deletePSO(req.params.id, req.user);
      return res.status(200).json({ success: true, data, message: 'PSO deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CurriculumController();
