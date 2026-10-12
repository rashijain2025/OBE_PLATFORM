const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 12,
    },
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: [true, 'Programme is required'],
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2025-2026)'],
      trim: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ code: 1, academicYear: 1, programme: 1 }, { unique: true });
courseSchema.index({ faculty: 1 });

module.exports = mongoose.model('Course', courseSchema);
