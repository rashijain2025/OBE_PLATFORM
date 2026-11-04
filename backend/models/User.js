const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    passwordHash: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['admin', 'coordinator', 'faculty', 'student'],
      default: 'faculty',
      required: true,
    },
    roles: {
      type: [String],
      enum: ['admin', 'coordinator', 'faculty', 'student'],
      default: function () {
        return this.role ? [this.role] : ['faculty'];
      },
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programme',
      default: null,
    },
    rollNo: {
      type: String,
      trim: true,
      default: null,
    },
    // Student class list grouping: programme + batch (admission year) + section
    batch: {
      type: String,
      trim: true,
      default: null,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.googleId;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.googleId;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ role: 1, programme: 1, batch: 1, section: 1 });

module.exports = mongoose.model('User', userSchema);
