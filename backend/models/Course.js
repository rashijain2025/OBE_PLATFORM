const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: [true, 'Course code is required'],
        trim: true,
        uppercase: true,
    },
    courseName: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: [1, 'Semester must be at least 1'],
        max: [8, 'Semester cannot exceed 8'],
    },
    credits: {
        type: Number,
        required: [true, 'Credits are required'],
        min: [1, 'Credits must be at least 1'],
        max: [6, 'Credits cannot exceed 6'],
    },
    academicYear: {
        type: String,
        required: [true, 'Academic year is required'],
        trim: true,
        // e.g., "2025-26"
    },
    assignedFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned faculty is required'],
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// ── Indexes ────────────────────────────────────────────────────────────
// Compound unique: same course code cannot exist twice in the same academic year
courseSchema.index({ courseCode: 1, academicYear: 1 }, { unique: true });

// Faculty lookup — used by GET /api/courses/my-courses
courseSchema.index({ assignedFaculty: 1 });

// Department queries
courseSchema.index({ department: 1 });

module.exports = mongoose.model('Course', courseSchema);
