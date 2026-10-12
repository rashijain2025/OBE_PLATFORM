const mongoose = require('mongoose');

const psoSchema = new mongoose.Schema(
  {
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      required: [true, 'Programme reference is required'],
    },
    code: {
      type: String,
      required: [true, 'PSO code is required (e.g. PSO1, PSO2)'],
      trim: true,
      uppercase: true,
    },
    statement: {
      type: String,
      required: [true, 'PSO statement is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

psoSchema.index({ programme: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PSO', psoSchema);
