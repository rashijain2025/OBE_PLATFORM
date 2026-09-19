const mongoose = require('mongoose');

/**
 * Question Schema
 * ───────────────
 * Represents a single question within an Assessment.
 * Each question is mapped to exactly ONE CourseOutcome (CO) belonging to the
 * same course as the assessment — this is the foundation for CO attainment
 * calculation later:
 *
 *   Question.marks  →  CO-wise performance  →  CO Attainment
 *
 * Relationships:
 *   Assessment ──┐
 *   Course ──────┼── Question
 *   CourseOutcome ┘
 *
 * Invariant enforced at the controller level:
 *   Question.course === Assessment.course === CourseOutcome.course
 */
const questionSchema = new mongoose.Schema({
    assessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: [true, 'Assessment is required'],
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
    },
    questionText: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true,
    },
    questionNumber: {
        type: Number,
        required: [true, 'Question number is required'],
        min: [1, 'Question number must be at least 1'],
    },
    marks: {
        type: Number,
        required: [true, 'Marks are required'],
        min: [0.5, 'Marks must be at least 0.5'],
    },
    co: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseOutcome',
        required: [true, 'Course Outcome (CO) mapping is required'],
    },
    questionType: {
        type: String,
        required: [true, 'Question type is required'],
        enum: {
            values: ['MCQ', 'Short Answer', 'Long Answer', 'Numerical', 'Other'],
            message: '{VALUE} is not a valid question type',
        },
        default: 'Short Answer',
    },
    order: {
        type: Number,
        default: 1,
        min: [1, 'Order must be at least 1'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// ── Indexes ────────────────────────────────────────────────────────────
// Unique question number within an assessment
questionSchema.index({ assessment: 1, questionNumber: 1 }, { unique: true });

// Fetch all questions for an assessment, ordered
questionSchema.index({ assessment: 1, order: 1 });

// CO-wise aggregation index (used for future attainment calculations)
questionSchema.index({ course: 1, co: 1 });

module.exports = mongoose.model('Question', questionSchema);
