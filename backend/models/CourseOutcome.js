const mongoose = require('mongoose');

const courseOutcomeSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    code: {
      type: String,
      required: [true, 'CO code is required (e.g. CO1)'],
      trim: true,
      uppercase: true,
    },
    statement: {
      type: String,
      required: [true, 'CO statement is required'],
      trim: true,
    },
    targetMarksPercentage: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },
    targetAttainmentPercentage: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    bloomLevel: {
      type: String,
      enum: ['L1: Remember', 'L2: Understand', 'L3: Apply', 'L4: Analyze', 'L5: Evaluate', 'L6: Create'],
      default: 'L3: Apply',
    },
  },
  {
    timestamps: true,
  }
);

courseOutcomeSchema.index({ course: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('CourseOutcome', courseOutcomeSchema);
