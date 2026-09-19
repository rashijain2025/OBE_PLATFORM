const mongoose = require('mongoose');

const courseEnrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required'],
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required'],
    },
    enrollmentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'inactive'],
            message: '{VALUE} is not a valid status. Allowed: active, inactive',
        },
        default: 'active',
    },
    academicYear: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// ── Compound Unique Index ────────────────────────────────────────────────────
// A student cannot be enrolled in the same course more than once
courseEnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Secondary indexes for performance
courseEnrollmentSchema.index({ course: 1, status: 1 });
courseEnrollmentSchema.index({ student: 1 });

module.exports = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
