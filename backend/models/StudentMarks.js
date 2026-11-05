const mongoose = require('mongoose');

const studentMarksSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    marksObtained: {
      type: Number,
      default: null, // null represents absent / not graded yet
      min: 0,
    },
    // Marked "AB" by faculty: counts as entered for progress, excluded from attainment like a blank
    isAbsent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

studentMarksSchema.index({ student: 1, question: 1 }, { unique: true });
studentMarksSchema.index({ course: 1, assessment: 1 });

module.exports = mongoose.model('StudentMarks', studentMarksSchema);
