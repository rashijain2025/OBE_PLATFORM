const attainmentService = require('./attainmentService');
const { Programme, Course, PO, PSO, COPOMapping, COPSOMapping } = require('../models');

/**
 * =========================================================================
 * CLEARLY LABELED DEFAULT FORMULA (SWAPPABLE):
 *
 * PO / PSO Attainment = Σ(CO attainment × strength) / Σ(strength)
 * calculated strictly over mapped COs that have evaluation data (classAttainment !== null).
 *
 * BEHAVIOR SPECIFICATION:
 * - If no mapped COs have evaluation data (either unmapped or no marks entered),
 *   returns attainment: null, status: "Not mapped / No data".
 * - NEVER defaults to 0%.
 * =========================================================================
 */
function calculateDefaultOutcomeAttainment(contributingItems) {
  const evaluatedItems = contributingItems.filter(
    (item) => item.coAttainment !== null && item.coAttainment !== undefined && item.strength > 0
  );

  if (evaluatedItems.length === 0) {
    return {
      attainment: null,
      status: 'Not mapped / No data',
      totalStrength: 0,
      evaluatedCount: 0,
    };
  }

  const sumWeighted = evaluatedItems.reduce((acc, item) => acc + item.coAttainment * item.strength, 0);
  const sumStrength = evaluatedItems.reduce((acc, item) => acc + item.strength, 0);

  if (sumStrength === 0) {
    return {
      attainment: null,
      status: 'Not mapped / No data',
      totalStrength: 0,
      evaluatedCount: 0,
    };
  }

  const attainment = Number((sumWeighted / sumStrength).toFixed(1));
  return {
    attainment,
    status: 'Evaluated',
    totalStrength: sumStrength,
    evaluatedCount: evaluatedItems.length,
  };
}

class ProgrammeAttainmentService {
  /**
   * Helper: verify coordinator access to programme
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
   * Calculate Programme PO and PSO Attainment
   * Consumes attainmentService.calculateCourseCOAttainment for each course in the programme.
   *
   * @param {string} programmeId
   * @param {Object} options - { target = 60, academicYear }
   * @param {Object} user - auth user
   */
  async calculateProgrammeAttainment(programmeId, options = {}, user = null) {
    const targetThreshold = Number(options.target) || 60;
    const { academicYear } = options;

    const programme = await this.verifyProgrammeAccess(programmeId, user);

    // 1. Fetch all POs and PSOs defined for this programme
    const [pos, psos] = await Promise.all([
      PO.find({ programme: programmeId }).sort({ code: 1 }),
      PSO.find({ programme: programmeId }).sort({ code: 1 }),
    ]);

    // 2. Fetch courses belonging to this programme
    const courseQuery = { programme: programmeId };
    if (academicYear) {
      courseQuery.academicYear = academicYear;
    }
    const courses = await Course.find(courseQuery).populate('faculty', 'name email').sort({ code: 1 });

    // 3. For each course, fetch CO attainment via attainmentService (CONSUMES, DOES NOT RECOMPUTE)
    // and retrieve its CO-PO and CO-PSO mappings
    const courseResults = [];
    const allContributingCOPODocs = [];
    const allContributingCOPSODocs = [];

    for (const course of courses) {
      // Consume course CO attainment service
      const coAttainmentData = await attainmentService.calculateCourseCOAttainment(course._id, targetThreshold, user);

      // Fetch mappings for this course
      const [copoMappings, copsoMappings] = await Promise.all([
        COPOMapping.find({ course: course._id }).populate('programOutcome', 'code title'),
        COPSOMapping.find({ course: course._id }).populate('programSpecificOutcome', 'code statement'),
      ]);

      // Create a map of CO ID -> CO attainment result
      const coMap = new Map();
      for (const co of coAttainmentData.cos) {
        coMap.set(String(co.coId), co);
      }

      // Group mappings with their CO attainment
      const courseCOPODetails = copoMappings.map((m) => {
        const co = coMap.get(String(m.courseOutcome));
        return {
          courseId: course._id,
          courseCode: course.code,
          courseName: course.name,
          coId: m.courseOutcome,
          coCode: co?.code || 'CO',
          statement: co?.statement || '',
          coAttainment: co ? co.classAttainment : null,
          poId: m.programOutcome?._id || m.programOutcome,
          poCode: m.programOutcome?.code || '',
          strength: m.correlationLevel,
        };
      });

      const courseCOPSODetails = copsoMappings.map((m) => {
        const co = coMap.get(String(m.courseOutcome));
        return {
          courseId: course._id,
          courseCode: course.code,
          courseName: course.name,
          coId: m.courseOutcome,
          coCode: co?.code || 'CO',
          statement: co?.statement || '',
          coAttainment: co ? co.classAttainment : null,
          psoId: m.programSpecificOutcome?._id || m.programSpecificOutcome,
          psoCode: m.programSpecificOutcome?.code || '',
          strength: m.correlationLevel,
        };
      });

      allContributingCOPODocs.push(...courseCOPODetails);
      allContributingCOPSODocs.push(...courseCOPSODetails);

      courseResults.push({
        course: {
          _id: course._id,
          code: course.code,
          name: course.name,
          academicYear: course.academicYear,
          semester: course.semester,
          credits: course.credits,
          faculty: course.faculty,
        },
        coAttainment: coAttainmentData,
        copoDetails: courseCOPODetails,
        copsoDetails: courseCOPSODetails,
      });
    }

    // 4. Calculate Attainment for each Program Outcome (PO)
    const poAttainmentList = pos.map((po) => {
      const poIdStr = String(po._id);
      const contributingCOs = allContributingCOPODocs.filter((doc) => String(doc.poId) === poIdStr);

      const calc = calculateDefaultOutcomeAttainment(contributingCOs);

      let status = 'Not mapped / No data';
      let gap = null;
      let isAttained = false;

      if (calc.attainment !== null) {
        isAttained = calc.attainment >= targetThreshold;
        status = isAttained ? 'Attained' : 'Below Target';
        gap = !isAttained ? Number((targetThreshold - calc.attainment).toFixed(1)) : 0;
      }

      return {
        outcomeId: po._id,
        code: po.code,
        title: po.title || '',
        statement: po.statement,
        type: 'PO',
        targetThreshold,
        attainment: calc.attainment,
        status,
        gap,
        isAttained,
        totalStrength: calc.totalStrength,
        evaluatedCOsCount: calc.evaluatedCount,
        totalMappedCOsCount: contributingCOs.length,
        contributingCOs,
      };
    });

    // 5. Calculate Attainment for each Program Specific Outcome (PSO)
    const psoAttainmentList = psos.map((pso) => {
      const psoIdStr = String(pso._id);
      const contributingCOs = allContributingCOPSODocs.filter((doc) => String(doc.psoId) === psoIdStr);

      const calc = calculateDefaultOutcomeAttainment(contributingCOs);

      let status = 'Not mapped / No data';
      let gap = null;
      let isAttained = false;

      if (calc.attainment !== null) {
        isAttained = calc.attainment >= targetThreshold;
        status = isAttained ? 'Attained' : 'Below Target';
        gap = !isAttained ? Number((targetThreshold - calc.attainment).toFixed(1)) : 0;
      }

      return {
        outcomeId: pso._id,
        code: pso.code,
        statement: pso.statement,
        type: 'PSO',
        targetThreshold,
        attainment: calc.attainment,
        status,
        gap,
        isAttained,
        totalStrength: calc.totalStrength,
        evaluatedCOsCount: calc.evaluatedCount,
        totalMappedCOsCount: contributingCOs.length,
        contributingCOs,
      };
    });

    // 6. Aggregate Program Level Statistics
    const evaluatedPOs = poAttainmentList.filter((p) => p.attainment !== null);
    const attainedPOs = evaluatedPOs.filter((p) => p.isAttained);
    const belowTargetPOs = evaluatedPOs.filter((p) => !p.isAttained);
    const unmappedPOs = poAttainmentList.filter((p) => p.attainment === null);

    const evaluatedPSOs = psoAttainmentList.filter((p) => p.attainment !== null);
    const attainedPSOs = evaluatedPSOs.filter((p) => p.isAttained);
    const belowTargetPSOs = evaluatedPSOs.filter((p) => !p.isAttained);
    const unmappedPSOs = psoAttainmentList.filter((p) => p.attainment === null);

    const averagePOAttainment =
      evaluatedPOs.length > 0
        ? Number((evaluatedPOs.reduce((sum, p) => sum + p.attainment, 0) / evaluatedPOs.length).toFixed(1))
        : null;

    const averagePSOAttainment =
      evaluatedPSOs.length > 0
        ? Number((evaluatedPSOs.reduce((sum, p) => sum + p.attainment, 0) / evaluatedPSOs.length).toFixed(1))
        : null;

    // Combined below-target list for executive gap analysis
    const belowTargetOutcomes = [...belowTargetPOs, ...belowTargetPSOs];

    // 7. Course x PO and Course x PSO Matrix Summary (for NBA tables)
    const courseMatrix = courses.map((course) => {
      const courseIdStr = String(course._id);
      const cpoMap = {};
      const cpsoMap = {};

      for (const po of pos) {
        const mapped = allContributingCOPODocs.filter(
          (d) => String(d.courseId) === courseIdStr && String(d.poId) === String(po._id)
        );
        const calc = calculateDefaultOutcomeAttainment(mapped);
        cpoMap[po.code] = {
          attainment: calc.attainment,
          strengthAvg: mapped.length > 0 ? Number((mapped.reduce((s, m) => s + m.strength, 0) / mapped.length).toFixed(1)) : null,
          mappedCOCount: mapped.length,
        };
      }

      for (const pso of psos) {
        const mapped = allContributingCOPSODocs.filter(
          (d) => String(d.courseId) === courseIdStr && String(d.psoId) === String(pso._id)
        );
        const calc = calculateDefaultOutcomeAttainment(mapped);
        cpsoMap[pso.code] = {
          attainment: calc.attainment,
          strengthAvg: mapped.length > 0 ? Number((mapped.reduce((s, m) => s + m.strength, 0) / mapped.length).toFixed(1)) : null,
          mappedCOCount: mapped.length,
        };
      }

      return {
        courseId: course._id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        pos: cpoMap,
        psos: cpsoMap,
      };
    });

    return {
      programme: {
        _id: programme._id,
        name: programme.name,
        code: programme.code,
        department: programme.department,
        level: programme.level,
      },
      targetThreshold,
      academicYear: academicYear || 'All Academic Years',
      coursesCount: courses.length,
      summary: {
        pos: {
          total: pos.length,
          evaluated: evaluatedPOs.length,
          attained: attainedPOs.length,
          belowTarget: belowTargetPOs.length,
          notMapped: unmappedPOs.length,
          averageAttainment: averagePOAttainment,
        },
        psos: {
          total: psos.length,
          evaluated: evaluatedPSOs.length,
          attained: attainedPSOs.length,
          belowTarget: belowTargetPSOs.length,
          notMapped: unmappedPSOs.length,
          averageAttainment: averagePSOAttainment,
        },
        totalBelowTargetCount: belowTargetOutcomes.length,
      },
      pos: poAttainmentList,
      psos: psoAttainmentList,
      belowTargetOutcomes,
      courseMatrix,
    };
  }

  /**
   * Calculate course-specific PO/PSO attainment
   */
  async calculateCoursePOAttainment(courseId, target = 60, user = null) {
    const course = await Course.findById(courseId).populate('programme');
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }
    const programmeId = course.programme._id || course.programme;
    const programmeData = await this.calculateProgrammeAttainment(
      programmeId,
      { target, academicYear: course.academicYear },
      user
    );

    // Extract this course's specific contribution
    const courseSummary = programmeData.courseMatrix.find((c) => String(c.courseId) === String(courseId));

    return {
      course: {
        _id: course._id,
        code: course.code,
        name: course.name,
        programme: course.programme,
      },
      targetThreshold: Number(target) || 60,
      courseSummary,
      pos: programmeData.pos.map((p) => ({
        ...p,
        contributingCOs: p.contributingCOs.filter((c) => String(c.courseId) === String(courseId)),
      })),
      psos: programmeData.psos.map((p) => ({
        ...p,
        contributingCOs: p.contributingCOs.filter((c) => String(c.courseId) === String(courseId)),
      })),
    };
  }

  /**
   * Generate RFC-4180 CSV export of Programme Attainment Report
   */
  async generateProgrammeCSV(programmeId, options = {}, user = null) {
    const data = await this.calculateProgrammeAttainment(programmeId, options, user);
    const lines = [];

    // Header Metadata
    lines.push(`PROGRAMME ATTAINMENT REPORT (OBE ACCREDITATION)`);
    lines.push(`Programme Name,"${data.programme.name}"`);
    lines.push(`Programme Code,${data.programme.code}`);
    lines.push(`Academic Year,${data.academicYear}`);
    lines.push(`Target Threshold,${data.targetThreshold}%`);
    lines.push(`Total Courses Evaluated,${data.coursesCount}`);
    lines.push(`Average PO Attainment,${data.summary.pos.averageAttainment !== null ? data.summary.pos.averageAttainment + '%' : 'N/A'}`);
    lines.push(`Average PSO Attainment,${data.summary.psos.averageAttainment !== null ? data.summary.psos.averageAttainment + '%' : 'N/A'}`);
    lines.push(``);

    // Section 1: PO Attainment Table
    lines.push(`PROGRAM OUTCOMES (PO) ATTAINMENT`);
    lines.push(`Code,Title,Target (%),Attainment (%),Status,Gap (%),Evaluated COs,Total Mapped COs,Statement`);
    for (const po of data.pos) {
      lines.push(
        [
          po.code,
          `"${po.title.replace(/"/g, '""')}"`,
          po.targetThreshold,
          po.attainment !== null ? po.attainment : 'Not mapped / No data',
          po.status,
          po.gap !== null ? po.gap : 'N/A',
          po.evaluatedCOsCount,
          po.totalMappedCOsCount,
          `"${po.statement.replace(/"/g, '""')}"`,
        ].join(',')
      );
    }
    lines.push(``);

    // Section 2: PSO Attainment Table
    lines.push(`PROGRAM SPECIFIC OUTCOMES (PSO) ATTAINMENT`);
    lines.push(`Code,Target (%),Attainment (%),Status,Gap (%),Evaluated COs,Total Mapped COs,Statement`);
    for (const pso of data.psos) {
      lines.push(
        [
          pso.code,
          pso.targetThreshold,
          pso.attainment !== null ? pso.attainment : 'Not mapped / No data',
          pso.status,
          pso.gap !== null ? pso.gap : 'N/A',
          pso.evaluatedCOsCount,
          pso.totalMappedCOsCount,
          `"${pso.statement.replace(/"/g, '""')}"`,
        ].join(',')
      );
    }
    lines.push(``);

    // Section 3: Course-wise PO Matrix
    if (data.courseMatrix.length > 0) {
      lines.push(`COURSE-WISE PO ATTAINMENT MATRIX`);
      const poCodes = data.pos.map((p) => p.code);
      lines.push(`Course Code,Course Name,Semester,${poCodes.join(',')}`);
      for (const row of data.courseMatrix) {
        const poVals = poCodes.map((code) => {
          const val = row.pos[code]?.attainment;
          return val !== null && val !== undefined ? val : '-';
        });
        lines.push([row.code, `"${row.name.replace(/"/g, '""')}"`, row.semester, ...poVals].join(','));
      }
      lines.push(``);
    }

    // Section 4: Contributing COs Breakdown
    lines.push(`CONTRIBUTING COURSE OUTCOMES DETAIL`);
    lines.push(`Outcome Code,Course Code,Course Name,CO Code,CO Attainment (%),Mapping Strength (1-3)`);
    for (const po of data.pos) {
      for (const c of po.contributingCOs) {
        lines.push([
          po.code,
          c.courseCode,
          `"${c.courseName.replace(/"/g, '""')}"`,
          c.coCode,
          c.coAttainment !== null ? c.coAttainment : 'N/A',
          c.strength,
        ].join(','));
      }
    }
    for (const pso of data.psos) {
      for (const c of pso.contributingCOs) {
        lines.push([
          pso.code,
          c.courseCode,
          `"${c.courseName.replace(/"/g, '""')}"`,
          c.coCode,
          c.coAttainment !== null ? c.coAttainment : 'N/A',
          c.strength,
        ].join(','));
      }
    }

    return lines.join('\n');
  }
}

module.exports = new ProgrammeAttainmentService();
