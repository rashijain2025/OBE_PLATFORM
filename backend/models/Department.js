const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'School / Centre name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'School / Centre code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Department-wide CO targets, set by the coordinator and pre-filled on every new CO
    obeTargets: {
      targetMarksPercentage: { type: Number, default: 60, min: 0, max: 100 },
      targetAttainmentPercentage: { type: Number, default: 70, min: 0, max: 100 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Department', departmentSchema);
