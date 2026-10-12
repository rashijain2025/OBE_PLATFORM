const mongoose = require('mongoose');

const poSchema = new mongoose.Schema(
  {
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: [true, 'Programme reference is required'],
    },
    code: {
      type: String,
      required: [true, 'PO code is required (e.g. PO1 to PO12)'],
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    statement: {
      type: String,
      required: [true, 'PO statement is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

poSchema.index({ programme: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PO', poSchema);
