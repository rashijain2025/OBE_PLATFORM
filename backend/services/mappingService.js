const { Course, CourseOutcome, PO, PSO, COPOMapping, COPSOMapping, Programme } = require('../models');

class MappingService {
  /**
   * Helper: verify course exists and coordinator has access
   */
  async verifyCourseCoordinatorAccess(courseId, user) {
    const course = await Course.findById(courseId)
      .populate('programme')
      .populate('faculty', 'name email');

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    if (user && user.role === 'coordinator' && user.department) {
      // Coordinator must match course's programme department
      const programme = await Programme.findById(course.programme._id || course.programme);
      if (programme && String(programme.department) !== String(user.department._id || user.department)) {
        const err = new Error('Forbidden: You do not have coordinator access to this course programme');
        err.statusCode = 403;
        throw err;
      }
    }

    return course;
  }

  /**
   * Get complete matrix view for a course:
   * - Course metadata
   * - Course Outcomes (COs)
   * - Programme Outcomes (POs)
   * - Programme Specific Outcomes (PSOs)
   * - Current mappings
   */
  async getCourseMappingMatrix(courseId, user = null) {
    const course = await this.verifyCourseCoordinatorAccess(courseId, user);
    const programmeId = course.programme._id || course.programme;

    const [cos, pos, psos, copoMappings, copsoMappings] = await Promise.all([
      CourseOutcome.find({ course: courseId }).sort({ code: 1 }),
      PO.find({ programme: programmeId }).sort({ code: 1 }),
      PSO.find({ programme: programmeId }).sort({ code: 1 }),
      COPOMapping.find({ course: courseId }),
      COPSOMapping.find({ course: courseId }),
    ]);

    // Build structured lookup maps for rapid frontend matrix rendering
    const copoMap = {};
    for (const m of copoMappings) {
      const key = `${String(m.courseOutcome)}_${String(m.programOutcome)}`;
      copoMap[key] = m.correlationLevel;
    }

    const copsoMap = {};
    for (const m of copsoMappings) {
      const key = `${String(m.courseOutcome)}_${String(m.programSpecificOutcome)}`;
      copsoMap[key] = m.correlationLevel;
    }

    return {
      course: {
        _id: course._id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        credits: course.credits,
        faculty: course.faculty,
        programme: course.programme,
      },
      cos,
      pos,
      psos,
      copoMappings,
      copsoMappings,
      matrix: {
        copo: copoMap,
        copso: copsoMap,
      },
    };
  }

  /**
   * Save or update matrix mappings with strict CO -> course -> programme chain validation
   *
   * @param {string} courseId
   * @param {Object} data - { copo: [{ courseOutcomeId, programOutcomeId, correlationLevel }], copso: [...] }
   * @param {Object} user
   */
  async saveCourseMappingMatrix(courseId, data, user = null) {
    const course = await this.verifyCourseCoordinatorAccess(courseId, user);
    const programmeId = course.programme._id || course.programme;

    const { copo = [], copso = [] } = data;

    // Preload all COs for this course
    const validCOs = await CourseOutcome.find({ course: courseId });
    const validCOIdSet = new Set(validCOs.map((c) => String(c._id)));

    // Preload all POs and PSOs for this course's programme
    const validPOs = await PO.find({ programme: programmeId });
    const validPOIdSet = new Set(validPOs.map((p) => String(p._id)));

    const validPSOs = await PSO.find({ programme: programmeId });
    const validPSOIdSet = new Set(validPSOs.map((p) => String(p._id)));

    // 1. Process CO-PO mappings
    for (const item of copo) {
      const { courseOutcomeId, programOutcomeId, correlationLevel } = item;
      const coIdStr = String(courseOutcomeId);
      const poIdStr = String(programOutcomeId);

      // Validate CO -> Course chain
      if (!validCOIdSet.has(coIdStr)) {
        const err = new Error(`Validation Error: Course Outcome (${courseOutcomeId}) does not belong to course ${course.code}`);
        err.statusCode = 400;
        throw err;
      }

      // Validate PO -> Programme chain
      if (!validPOIdSet.has(poIdStr)) {
        const err = new Error(`Validation Error: Program Outcome (${programOutcomeId}) does not belong to programme ${course.programme.code || programmeId}`);
        err.statusCode = 400;
        throw err;
      }

      const level = correlationLevel !== null && correlationLevel !== undefined ? Number(correlationLevel) : 0;

      if (level === 0) {
        // Remove mapping if set to 0/empty
        await COPOMapping.findOneAndDelete({
          courseOutcome: courseOutcomeId,
          programOutcome: programOutcomeId,
        });
      } else if ([1, 2, 3].includes(level)) {
        // Upsert mapping (avoids duplicates)
        await COPOMapping.findOneAndUpdate(
          { courseOutcome: courseOutcomeId, programOutcome: programOutcomeId },
          {
            course: courseId,
            courseOutcome: courseOutcomeId,
            programOutcome: programOutcomeId,
            correlationLevel: level,
          },
          { upsert: true, new: true }
        );
      } else {
        const err = new Error(`Invalid correlation level: ${level}. Must be 1, 2, 3, or 0 (none).`);
        err.statusCode = 400;
        throw err;
      }
    }

    // 2. Process CO-PSO mappings
    for (const item of copso) {
      const { courseOutcomeId, programSpecificOutcomeId, correlationLevel } = item;
      const coIdStr = String(courseOutcomeId);
      const psoIdStr = String(programSpecificOutcomeId);

      // Validate CO -> Course chain
      if (!validCOIdSet.has(coIdStr)) {
        const err = new Error(`Validation Error: Course Outcome (${courseOutcomeId}) does not belong to course ${course.code}`);
        err.statusCode = 400;
        throw err;
      }

      // Validate PSO -> Programme chain
      if (!validPSOIdSet.has(psoIdStr)) {
        const err = new Error(`Validation Error: Program Specific Outcome (${programSpecificOutcomeId}) does not belong to programme ${course.programme.code || programmeId}`);
        err.statusCode = 400;
        throw err;
      }

      const level = correlationLevel !== null && correlationLevel !== undefined ? Number(correlationLevel) : 0;

      if (level === 0) {
        // Remove mapping if set to 0/empty
        await COPSOMapping.findOneAndDelete({
          courseOutcome: courseOutcomeId,
          programSpecificOutcome: programSpecificOutcomeId,
        });
      } else if ([1, 2, 3].includes(level)) {
        // Upsert mapping (avoids duplicates)
        await COPSOMapping.findOneAndUpdate(
          { courseOutcome: courseOutcomeId, programSpecificOutcome: programSpecificOutcomeId },
          {
            course: courseId,
            courseOutcome: courseOutcomeId,
            programSpecificOutcome: programSpecificOutcomeId,
            correlationLevel: level,
          },
          { upsert: true, new: true }
        );
      } else {
        const err = new Error(`Invalid correlation level: ${level}. Must be 1, 2, 3, or 0 (none).`);
        err.statusCode = 400;
        throw err;
      }
    }

    return this.getCourseMappingMatrix(courseId, user);
  }
}

module.exports = new MappingService();
