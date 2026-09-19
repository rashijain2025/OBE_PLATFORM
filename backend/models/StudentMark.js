const mongoose = require('mongoose');

/**
 * StudentMark Schema
 * ──────────────────
 * Stores marks obtained by a student for an individual question in an assessment.
 * This forms the foundational grain for OBE evaluation:
 *
 *   Student → StudentMark → Question → CourseOutcome → CO Attainment
 *
 * Invariants:
 *  - 1:1 mapping per (student, question) enforced via compound unique index.
 *  - marksObtained >= 0 and <= question.marks (enforced in controller).
 */
const studentMarkSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student reference is required'],
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course reference is required'],
    },
    assessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: [true, 'Assessment reference is required'],
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: [true, 'Question reference is required'],
    },
    marksObtained: {
        type: Number,
        required: [true, 'Marks obtained is required'],
        min: [0, 'Marks obtained cannot be negative'],
    },
    evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Evaluator reference is required'],
    },
    evaluatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// ── Compound Unique Index ────────────────────────────────────────────────────
// A student can only have one mark record per question
studentMarkSchema.index({ student: 1, question: 1 }, { unique: true });

// Secondary indexes for query performance
// Assessment marks grid lookup
studentMarkSchema.index({ assessment: 1, student: 1 });

// Course-level student performance lookup
studentMarkSchema.index({ course: 1, student: 1 });

// Question-level aggregation index for CO attainment
studentMarkSchema.index({ question: 1 });

module.exports = mongoose.model('StudentMark', studentMarkSchema);
