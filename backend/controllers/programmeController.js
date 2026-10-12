const programmeService = require('../services/programmeService');

class ProgrammeController {
  async list(req, res, next) {
    try {
      const progs = await programmeService.listProgrammes();
      res.json({ success: true, data: progs, message: 'Programmes retrieved successfully' });
    } catch (err) { next(err); }
  }

  async getOne(req, res, next) {
    try {
      const prog = await programmeService.getProgrammeById(req.params.id);
      res.json({ success: true, data: prog, message: 'Programme retrieved successfully' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const { name, code, department, durationYears, level } = req.body;
      if (!name || !code || !department) {
        return res.status(400).json({ success: false, data: null, message: 'name, code and department are required' });
      }
      const prog = await programmeService.createProgramme({ name, code, department, durationYears, level });
      res.status(201).json({ success: true, data: prog, message: 'Programme created successfully' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const { name, code, department, durationYears, level } = req.body;
      const prog = await programmeService.updateProgramme(req.params.id, { name, code, department, durationYears, level });
      res.json({ success: true, data: prog, message: 'Programme updated successfully' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const result = await programmeService.deleteProgramme(req.params.id);
      res.json({ success: true, data: result, message: 'Programme deleted successfully' });
    } catch (err) { next(err); }
  }
}

module.exports = new ProgrammeController();
