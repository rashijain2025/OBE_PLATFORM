const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    label: {
      type: String,
      required: [true, 'Question label is required (e.g. Q1a, Q1b, Q2)'],
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks for the question is required'],
      min: 1,
    },
    co: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOutcome',
      required: [true, 'Course Outcome reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ assessment: 1, label: 1 }, { unique: true });
questionSchema.index({ course: 1 });
questionSchema.index({ co: 1 });

module.exports = mongoose.model('Question', questionSchema);
