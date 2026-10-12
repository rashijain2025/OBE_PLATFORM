const mongoose = require('mongoose');

const courseEnrollmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    status: {
      type: String,
      enum: ['active', 'dropped', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

courseEnrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
