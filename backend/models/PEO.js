const mongoose = require('mongoose');

const peoSchema = new mongoose.Schema(
  {
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: [true, 'Programme reference is required'],
    },
    code: {
      type: String,
      required: [true, 'PEO code is required (e.g. PEO1)'],
      trim: true,
      uppercase: true,
    },
    statement: {
      type: String,
      required: [true, 'PEO statement is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

peoSchema.index({ programme: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PEO', peoSchema);
