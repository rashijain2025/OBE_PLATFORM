const mongoose = require('mongoose');

const copsoMappingSchema = new mongoose.Schema(
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
    programSpecificOutcome: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PSO',
      required: [true, 'Program Specific Outcome reference is required'],
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

copsoMappingSchema.index({ courseOutcome: 1, programSpecificOutcome: 1 }, { unique: true });
copsoMappingSchema.index({ course: 1 });

module.exports = mongoose.model('COPSOMapping', copsoMappingSchema);
