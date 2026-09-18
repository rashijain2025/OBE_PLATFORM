const mongoose = require('mongoose');

/**
 * CourseOutcome Schema
 * ─────────────────────
 * Represents a specific Course Outcome (CO) for an academic course.
 * Each CO belongs to exactly one Course and has a unique code within that course.
 */
const courseOutcomeSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
    },
    code: {
        type: String,
        required: [true, 'Course Outcome code is required (e.g. CO1)'],
        trim: true,
        uppercase: true,
    },
    description: {
        type: String,
        required: [true, 'Course Outcome description is required'],
        trim: true,
    },
    order: {
        type: Number,
        required: [true, 'Order is required'],
        min: [1, 'Order must be at least 1'],
        default: 1,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// ── Indexes ────────────────────────────────────────────────────────────
// Compound unique index: Prevent duplicate CO codes within the same course (e.g., duplicate CO1 in CS301)
courseOutcomeSchema.index({ course: 1, code: 1 }, { unique: true });

// Query optimization for fetching and ordering COs within a course
courseOutcomeSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('CourseOutcome', courseOutcomeSchema);
