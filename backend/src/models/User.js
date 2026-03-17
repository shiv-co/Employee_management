const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const phoneRegex = /^\+?[0-9]{10,15}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee'
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      trim: true,
      default: ''
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator(value) {
          return !value || phoneRegex.test(value);
        },
        message: 'Invalid mobile number format'
      }
    },
    dob: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const saltRounds = 10;
  this.passwordHash = await bcrypt.hash(plainPassword, saltRounds);
};

module.exports = mongoose.model('User', userSchema);
