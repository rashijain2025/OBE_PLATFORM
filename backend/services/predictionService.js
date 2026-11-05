const { Course, CourseOutcome, Assessment, Question, CourseEnrollment, StudentMarks } = require('../models');

class PredictionService {
  getMlServiceUrl() {
    return process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }
  /**
   * Helper: verify faculty owns the course or user is admin/coordinator
   */
  async verifyCourseAccess(courseId, user) {
    const course = await Course.findById(courseId)
      .populate('faculty', 'name email')
      .populate('programme', 'name code');

    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    if (user && user.role === 'faculty' && String(course.faculty._id) !== String(user._id)) {
      const err = new Error('Forbidden: You are not the assigned faculty for this course');
      err.statusCode = 403;
      throw err;
    }

    return course;
  }

  /**
   * Extract features from actual marks for early warning prediction
   *
   * Features per (student, CO):
   * 1. early_co_pct: early-assessment score % for this CO so far
   * 2. num_eval_questions: number of evaluated questions mapped to this CO
   * 3. overall_early_pct: overall early score % across all early assessments
   * 4. trend: trend between early assessments (latest assessment % - earliest assessment %)
   */
  async extractCourseFeatures(courseId, target = 40) {
    const targetThreshold = Number(target) || 40;

    // 1. Fetch COs, Assessments, Questions, Enrollments, Marks
    const [cos, assessments, questions, enrollments, marks] = await Promise.all([
      CourseOutcome.find({ course: courseId }).sort({ code: 1 }),
      Assessment.find({ course: courseId }).sort({ date: 1, createdAt: 1 }),
      Question.find({ course: courseId }),
      CourseEnrollment.find({ course: courseId, status: 'active' }).populate('student', 'name rollNo email'),
      StudentMarks.find({ course: courseId }),
    ]);

    // 2. Identify early assessments (non-end_sem)
    const earlyAssessments = assessments.filter((a) => a.type !== 'end_sem');
    const earlyAssessmentIds = new Set(earlyAssessments.map((a) => String(a._id)));

    // Questions belonging to early assessments
    const earlyQuestions = questions.filter((q) => earlyAssessmentIds.has(String(q.assessment)));
    const earlyQuestionIdSet = new Set(earlyQuestions.map((q) => String(q._id)));

    // Mark map: `${studentId}_${questionId}` -> marksObtained
    const markMap = new Map();
    for (const m of marks) {
      const key = `${String(m.student)}_${String(m.question)}`;
      markMap.set(key, m.marksObtained);
    }

    const students = enrollments.map((e) => e.student).filter(Boolean);

    // Calculate per-student overall early performance and assessment trend
    const studentOverallStats = new Map();

    for (const student of students) {
      const studentIdStr = String(student._id);
      let totalEarlyObtained = 0;
      let totalEarlyMax = 0;

      // Track assessment-level performance for trend calculation
      const assessmentScores = [];

      for (const assessment of earlyAssessments) {
        const aQuestions = earlyQuestions.filter((q) => String(q.assessment) === String(assessment._id));
        let aObtained = 0;
        let aMax = 0;
        let hasMark = false;

        for (const q of aQuestions) {
          const key = `${studentIdStr}_${String(q._id)}`;
          if (markMap.has(key)) {
            const val = markMap.get(key);
            if (val !== null && val !== undefined) {
              aObtained += val;
              aMax += q.maxMarks;
              hasMark = true;
            }
          }
        }

        if (hasMark && aMax > 0) {
          const pct = (aObtained / aMax) * 100;
          assessmentScores.push(pct);
          totalEarlyObtained += aObtained;
          totalEarlyMax += aMax;
        }
      }

      const overallEarlyPct = totalEarlyMax > 0 ? Number(((totalEarlyObtained / totalEarlyMax) * 100).toFixed(1)) : 0.0;

      // Trend: difference between latest and earliest early assessment score (or 0 if only 1 assessment)
      let trend = 0.0;
      if (assessmentScores.length >= 2) {
        trend = Number((assessmentScores[assessmentScores.length - 1] - assessmentScores[0]).toFixed(1));
      }

      studentOverallStats.set(studentIdStr, {
        overallEarlyPct,
        trend,
        hasEarlyData: totalEarlyMax > 0,
      });
    }

    // 3. Build instances per (student, CO)
    const instances = [];

    for (const co of cos) {
      const coIdStr = String(co._id);
      const coEarlyQuestions = earlyQuestions.filter((q) => Question.coIdsOf(q).includes(coIdStr));

      for (const student of students) {
        const studentIdStr = String(student._id);
        const overall = studentOverallStats.get(studentIdStr) || { overallEarlyPct: 0.0, trend: 0.0, hasEarlyData: false };

        let coObtained = 0;
        let coMax = 0;
        let numEvalQuestions = 0;

        for (const q of coEarlyQuestions) {
          const key = `${studentIdStr}_${String(q._id)}`;
          if (markMap.has(key)) {
            const val = markMap.get(key);
            if (val !== null && val !== undefined) {
              coObtained += val;
              coMax += q.maxMarks;
              numEvalQuestions++;
            }
          }
        }

        const earlyCoPct = coMax > 0 ? Number(((coObtained / coMax) * 100).toFixed(1)) : 0.0;

        instances.push({
          student_id: String(student._id),
          student_name: student.name,
          roll_no: student.rollNo || 'N/A',
          co_id: String(co._id),
          co_code: co.code,
          early_co_pct: earlyCoPct,
          num_eval_questions: numEvalQuestions,
          overall_early_pct: overall.overallEarlyPct,
          trend: overall.trend,
          target_threshold: targetThreshold,
        });
      }
    }

    return {
      cos,
      earlyAssessments,
      totalStudents: students.length,
      targetThreshold,
      instances,
    };
  }

  /**
   * Predict student CO attainment risk for a course
   */
  async predictCourseAttainment(courseId, target = 40, user = null) {
    const course = await this.verifyCourseAccess(courseId, user);
    const featureData = await this.extractCourseFeatures(courseId, target);

    if (featureData.instances.length === 0) {
      return {
        mlServiceOnline: true,
        course: { _id: course._id, code: course.code, name: course.name },
        message: 'No enrolled students or course outcomes found for prediction.',
        predictions: [],
        classSummary: [],
        atRiskStudents: [],
        weakestCO: null,
        suggestedAction: 'Please enroll students and define course outcomes.',
      };
    }

    // Call ML Service with longer timeout (60s default) to accommodate Render sleeping free tier
    let mlResponseData;
    const mlUrl = this.getMlServiceUrl();
    const mlTimeoutMs = Number(process.env.ML_TIMEOUT_MS) || 60000;
    try {
      const response = await fetch(`${mlUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: featureData.instances }),
        signal: AbortSignal.timeout(mlTimeoutMs),
      });

      if (!response.ok) {
        throw new Error(`ML Service responded with HTTP ${response.status}`);
      }
      mlResponseData = await response.json();
    } catch (err) {
      // Graceful degradation when ML service is down/offline or waking up from sleep
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 23;
      const failureReason = isTimeout
        ? `ML service is waking up / timed out after ${Math.round(mlTimeoutMs / 1000)}s`
        : (err.cause?.code || err.code || err.message);

      return {
        mlServiceOnline: false,
        course: { _id: course._id, code: course.code, name: course.name },
        message: `ML Prediction Service is currently unavailable (${failureReason}). Early warning predictions cannot be calculated.`,
        data_source: 'Unavailable',
        predictions: null,
      };
    }

    const { predictions, model_info } = mlResponseData.data;

    // Group predictions per CO
    const coMap = new Map();
    for (const co of featureData.cos) {
      coMap.set(co.code, {
        coId: co._id,
        code: co.code,
        statement: co.statement,
        bloomLevel: co.bloomLevel,
        totalStudents: featureData.totalStudents,
        predictedAttainedCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        studentPredictions: [],
      });
    }

    for (const pred of predictions) {
      const coEntry = coMap.get(pred.co_code);
      if (coEntry) {
        if (pred.predicted_attained) coEntry.predictedAttainedCount++;
        if (pred.risk_level === 'high') coEntry.highRiskCount++;
        else if (pred.risk_level === 'medium') coEntry.mediumRiskCount++;
        else coEntry.lowRiskCount++;
        coEntry.studentPredictions.push(pred);
      }
    }

    // Calculate predicted class CO attainment
    const classSummary = [];
    let weakestCO = null;
    let lowestAttainment = 101.0;

    for (const coEntry of coMap.values()) {
      const total = coEntry.totalStudents || 1;
      const predictedClassAttainment = Number(((coEntry.predictedAttainedCount / total) * 100).toFixed(1));
      const willMeetTarget = predictedClassAttainment >= featureData.targetThreshold;
      const gap = !willMeetTarget ? Number((featureData.targetThreshold - predictedClassAttainment).toFixed(1)) : 0.0;

      const summaryItem = {
        coId: coEntry.coId,
        code: coEntry.code,
        statement: coEntry.statement,
        bloomLevel: coEntry.bloomLevel,
        targetThreshold: featureData.targetThreshold,
        predictedClassAttainment,
        predictedAttainedCount: coEntry.predictedAttainedCount,
        highRiskCount: coEntry.highRiskCount,
        mediumRiskCount: coEntry.mediumRiskCount,
        lowRiskCount: coEntry.lowRiskCount,
        willMeetTarget,
        gap,
        status: willMeetTarget ? 'On Track' : 'Likely Below Target',
      };

      classSummary.push(summaryItem);

      if (predictedClassAttainment < lowestAttainment) {
        lowestAttainment = predictedClassAttainment;
        weakestCO = summaryItem;
      }
    }

    // At-risk students (high and medium risk)
    const atRiskStudents = predictions
      .filter((p) => p.risk_level === 'high' || p.risk_level === 'medium')
      .sort((a, b) => a.attainment_probability - b.attainment_probability);

    // Generate suggested action text based on the weakest CO
    let suggestedAction = 'Class continuous assessment performance is on track across all course outcomes.';
    if (weakestCO && !weakestCO.willMeetTarget) {
      suggestedAction = `Intervention recommended for ${weakestCO.code} (${weakestCO.bloomLevel || 'competency'}). Predicted class attainment (${weakestCO.predictedClassAttainment}%) has a ${weakestCO.gap}% shortfall against target (${weakestCO.targetThreshold}%). Recommended actions: Schedule remedial problem-solving tutorial sessions, release supplementary practice worksheets on ${weakestCO.statement.slice(0, 60)}..., and offer peer mentoring for the ${weakestCO.highRiskCount} high-risk students before end-sem exams.`;
    }

    return {
      mlServiceOnline: true,
      course: {
        _id: course._id,
        code: course.code,
        name: course.name,
        semester: course.semester,
        academicYear: course.academicYear,
        faculty: course.faculty,
      },
      targetThreshold: featureData.targetThreshold,
      earlyAssessmentsCount: featureData.earlyAssessments.length,
      totalStudents: featureData.totalStudents,
      modelInfo: model_info,
      classSummary,
      weakestCO,
      suggestedAction,
      atRiskCount: atRiskStudents.length,
      atRiskStudents,
      allPredictions: predictions,
    };
  }

  /**
   * Get ML model info from ML service
   */
  async getModelInfo() {
    try {
      const mlUrl = this.getMlServiceUrl();
      const mlTimeoutMs = Number(process.env.ML_TIMEOUT_MS) || 60000;
      const response = await fetch(`${mlUrl}/model-info`, {
        signal: AbortSignal.timeout(mlTimeoutMs),
      });
      if (!response.ok) {
        throw new Error(`ML Service responded with HTTP ${response.status}`);
      }
      const data = await response.json();
      return { mlServiceOnline: true, ...data.data };
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 23;
      const failureReason = isTimeout
        ? 'ML service is waking up / timed out'
        : (err.cause?.code || err.code || err.message);
      return {
        mlServiceOnline: false,
        message: `ML Service is currently unavailable (${failureReason})`,
      };
    }
  }

  /**
   * Trigger ML model retraining (Admin only)
   */
  async trainModel() {
    try {
      const mlUrl = this.getMlServiceUrl();
      const trainTimeoutMs = Number(process.env.ML_TRAIN_TIMEOUT_MS) || 120000;
      const response = await fetch(`${mlUrl}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(trainTimeoutMs),
      });
      if (!response.ok) {
        throw new Error(`ML Service responded with HTTP ${response.status}`);
      }
      const data = await response.json();
      return { mlServiceOnline: true, ...data.data };
    } catch (err) {
      const error = new Error(`ML Service training failed: ${err.message}`);
      error.statusCode = 502;
      throw error;
    }
  }
}

module.exports = new PredictionService();
