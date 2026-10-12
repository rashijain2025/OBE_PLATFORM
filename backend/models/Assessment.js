const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Assessment name is required (e.g. CIE 1, Assignment 1, SEE)'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['internal', 'assignment', 'quiz', 'lab', 'end_sem'],
      required: [true, 'Assessment type is required'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      min: 1,
    },
    weightage: {
      type: Number,
      default: 1.0,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

assessmentSchema.index({ course: 1, name: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
