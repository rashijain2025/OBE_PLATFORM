const mongoose = require('mongoose');

const copoMappingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    courseOutcome: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOutcome',
      required: [true, 'Course Outcome reference is required'],
    },
    programOutcome: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PO',
      required: [true, 'Program Outcome reference is required'],
    },
    correlationLevel: {
      type: Number,
      enum: [1, 2, 3], // 1 = Low, 2 = Medium, 3 = High
      required: [true, 'Correlation level (1, 2, or 3) is required'],
    },
  },
  {
    timestamps: true,
  }
);

copoMappingSchema.index({ courseOutcome: 1, programOutcome: 1 }, { unique: true });
copoMappingSchema.index({ course: 1 });

module.exports = mongoose.model('COPOMapping', copoMappingSchema);
