const { PEO, PO, PSO, Programme, COPOMapping, COPSOMapping } = require('../models');

class CurriculumService {
  /**
   * Helper: verify coordinator has access to the programme
   */
  async verifyProgrammeAccess(programmeId, user) {
    const programme = await Programme.findById(programmeId).populate('department');
    if (!programme) {
      const err = new Error('Programme not found');
      err.statusCode = 404;
      throw err;
    }

    if (user && user.role === 'coordinator' && user.department) {
      if (String(programme.department._id || programme.department) !== String(user.department._id || user.department)) {
        const err = new Error('Forbidden: You do not have coordinator access to the school / centre of this programme');
        err.statusCode = 403;
        throw err;
      }
    }

    return programme;
  }

  /**
   * Get all PEOs, POs, and PSOs for a programme
   */
  async getCurriculumOutcomes(programmeId, user = null) {
    const programme = await this.verifyProgrammeAccess(programmeId, user);

    const [peos, pos, psos] = await Promise.all([
      PEO.find({ programme: programmeId }).sort({ code: 1 }),
      PO.find({ programme: programmeId }).sort({ code: 1 }),
      PSO.find({ programme: programmeId }).sort({ code: 1 }),
    ]);

    return {
      programme: {
        _id: programme._id,
        name: programme.name,
        code: programme.code,
        department: programme.department,
        level: programme.level,
      },
      peos,
      pos,
      psos,
    };
  }

  // ================= PEO CRUD =================
  async createPEO(data, user) {
    const { programmeId, code, statement } = data;
    if (!programmeId || !code || !statement) {
      const err = new Error('programmeId, code, and statement are required');
      err.statusCode = 400;
      throw err;
    }
    await this.verifyProgrammeAccess(programmeId, user);

    const formattedCode = code.toUpperCase().trim();
    const existing = await PEO.findOne({ programme: programmeId, code: formattedCode });
    if (existing) {
      const err = new Error(`PEO with code ${formattedCode} already exists for this programme`);
      err.statusCode = 400;
      throw err;
    }

    return PEO.create({
      programme: programmeId,
      code: formattedCode,
      statement: statement.trim(),
    });
  }

  async updatePEO(id, data, user) {
    const peo = await PEO.findById(id);
    if (!peo) {
      const err = new Error('PEO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(peo.programme, user);

    if (data.code && data.code.toUpperCase().trim() !== peo.code) {
      const formattedCode = data.code.toUpperCase().trim();
      const existing = await PEO.findOne({ programme: peo.programme, code: formattedCode });
      if (existing) {
        const err = new Error(`PEO with code ${formattedCode} already exists for this programme`);
        err.statusCode = 400;
        throw err;
      }
      peo.code = formattedCode;
    }
    if (data.statement !== undefined) peo.statement = data.statement.trim();

    await peo.save();
    return peo;
  }

  async deletePEO(id, user) {
    const peo = await PEO.findById(id);
    if (!peo) {
      const err = new Error('PEO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(peo.programme, user);
    await PEO.findByIdAndDelete(id);
    return { deleted: true, id };
  }

  // ================= PO CRUD =================
  async createPO(data, user) {
    const { programmeId, code, title, statement } = data;
    if (!programmeId || !code || !statement) {
      const err = new Error('programmeId, code, and statement are required');
      err.statusCode = 400;
      throw err;
    }
    await this.verifyProgrammeAccess(programmeId, user);

    const formattedCode = code.toUpperCase().trim();
    const existing = await PO.findOne({ programme: programmeId, code: formattedCode });
    if (existing) {
      const err = new Error(`PO with code ${formattedCode} already exists for this programme`);
      err.statusCode = 400;
      throw err;
    }

    return PO.create({
      programme: programmeId,
      code: formattedCode,
      title: title ? title.trim() : '',
      statement: statement.trim(),
    });
  }

  async updatePO(id, data, user) {
    const po = await PO.findById(id);
    if (!po) {
      const err = new Error('PO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(po.programme, user);

    if (data.code && data.code.toUpperCase().trim() !== po.code) {
      const formattedCode = data.code.toUpperCase().trim();
      const existing = await PO.findOne({ programme: po.programme, code: formattedCode });
      if (existing) {
        const err = new Error(`PO with code ${formattedCode} already exists for this programme`);
        err.statusCode = 400;
        throw err;
      }
      po.code = formattedCode;
    }
    if (data.title !== undefined) po.title = data.title.trim();
    if (data.statement !== undefined) po.statement = data.statement.trim();

    await po.save();
    return po;
  }

  async deletePO(id, user) {
    const po = await PO.findById(id);
    if (!po) {
      const err = new Error('PO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(po.programme, user);

    // Guard: check if mapped in COPOMapping
    const mappedCount = await COPOMapping.countDocuments({ programOutcome: id });
    if (mappedCount > 0) {
      const err = new Error(`Cannot delete PO ${po.code}: ${mappedCount} course outcome mapping(s) reference it`);
      err.statusCode = 400;
      throw err;
    }

    await PO.findByIdAndDelete(id);
    return { deleted: true, id };
  }

  // ================= PSO CRUD =================
  async createPSO(data, user) {
    const { programmeId, code, statement } = data;
    if (!programmeId || !code || !statement) {
      const err = new Error('programmeId, code, and statement are required');
      err.statusCode = 400;
      throw err;
    }
    await this.verifyProgrammeAccess(programmeId, user);

    const formattedCode = code.toUpperCase().trim();
    const existing = await PSO.findOne({ programme: programmeId, code: formattedCode });
    if (existing) {
      const err = new Error(`PSO with code ${formattedCode} already exists for this programme`);
      err.statusCode = 400;
      throw err;
    }

    return PSO.create({
      programme: programmeId,
      code: formattedCode,
      statement: statement.trim(),
    });
  }

  async updatePSO(id, data, user) {
    const pso = await PSO.findById(id);
    if (!pso) {
      const err = new Error('PSO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(pso.programme, user);

    if (data.code && data.code.toUpperCase().trim() !== pso.code) {
      const formattedCode = data.code.toUpperCase().trim();
      const existing = await PSO.findOne({ programme: pso.programme, code: formattedCode });
      if (existing) {
        const err = new Error(`PSO with code ${formattedCode} already exists for this programme`);
        err.statusCode = 400;
        throw err;
      }
      pso.code = formattedCode;
    }
    if (data.statement !== undefined) pso.statement = data.statement.trim();

    await pso.save();
    return pso;
  }

  async deletePSO(id, user) {
    const pso = await PSO.findById(id);
    if (!pso) {
      const err = new Error('PSO not found');
      err.statusCode = 404;
      throw err;
    }
    await this.verifyProgrammeAccess(pso.programme, user);

    // Guard: check if mapped in COPSOMapping
    const mappedCount = await COPSOMapping.countDocuments({ programSpecificOutcome: id });
    if (mappedCount > 0) {
      const err = new Error(`Cannot delete PSO ${pso.code}: ${mappedCount} course outcome mapping(s) reference it`);
      err.statusCode = 400;
      throw err;
    }

    await PSO.findByIdAndDelete(id);
    return { deleted: true, id };
  }
}

module.exports = new CurriculumService();
