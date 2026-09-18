const mongoose = require('mongoose');

/**
 * Assessment Schema
 * ─────────────────
 * Represents an academic evaluation event (Internal Exam, Assignment, Quiz, etc.)
 * belonging to a specific Course and managed by the assigned faculty.
 */
const assessmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
    },
    name: {
        type: String,
        required: [true, 'Assessment name is required (e.g. Internal Assessment 1)'],
        trim: true,
    },
    type: {
        type: String,
        required: [true, 'Assessment type is required'],
        enum: {
            values: ['Internal', 'Assignment', 'Quiz', 'Final Exam', 'Project', 'Lab'],
            message: '{VALUE} is not a valid assessment type',
        },
        default: 'Internal',
    },
    totalMarks: {
        type: Number,
        required: [true, 'Total marks are required'],
        min: [1, 'Total marks must be at least 1'],
    },
    weightage: {
        type: Number,
        min: [0, 'Weightage cannot be negative'],
        max: [100, 'Weightage cannot exceed 100%'],
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: {
            values: ['draft', 'active', 'completed'],
            message: '{VALUE} is not a valid assessment status',
        },
        default: 'active',
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
});

// ── Indexes ────────────────────────────────────────────────────────────
// Compound unique index: Prevent duplicate assessment names in the same course
assessmentSchema.index({ course: 1, name: 1 }, { unique: true });

// Status query index (used for active assessment counts)
assessmentSchema.index({ course: 1, status: 1 });

// Date sorting index
assessmentSchema.index({ course: 1, date: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
