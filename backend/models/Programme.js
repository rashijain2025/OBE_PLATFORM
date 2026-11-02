const mongoose = require('mongoose');

const programmeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Programme name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Programme code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    durationYears: {
      type: Number,
      default: 4,
    },
    level: {
      type: String,
      enum: ['UG', 'PG', 'Diploma', 'PhD'],
      default: 'UG',
    },
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Programme', programmeSchema);
