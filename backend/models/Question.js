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
    // Every Course Outcome this question assesses; its full marks count towards each of them
    cos: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CourseOutcome' }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Map the question to at least one Course Outcome',
      },
    },
    // First mapped CO, kept for older code and records that store a single CO
    co: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOutcome',
    },
  },
  {
    timestamps: true,
  }
);

// Keep `cos` and `co` in step whichever one a caller sets
questionSchema.pre('validate', function syncCOs(next) {
  if ((!this.cos || this.cos.length === 0) && this.co) this.cos = [this.co];
  if (this.cos && this.cos.length > 0) this.co = this.cos[0];
  next();
});

/**
 * CO ids a question is mapped to, for both new (cos) and old (co only) records
 */
questionSchema.statics.coIdsOf = function coIdsOf(q) {
  const list = q.cos && q.cos.length > 0 ? q.cos : q.co ? [q.co] : [];
  return list.map((c) => String(c?._id || c));
};

questionSchema.index({ assessment: 1, label: 1 }, { unique: true });
questionSchema.index({ course: 1 });
questionSchema.index({ co: 1 });
questionSchema.index({ cos: 1 });

module.exports = mongoose.model('Question', questionSchema);
