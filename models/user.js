const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: Number, default: null },
  otpExpires: { type: Date, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  address: { type: String },
  phoneNumber: { type: Number },
  idNumber: { type: Number },
  companyName: { type: String, default: 'Independent' },
  languagesSpoken: { type: [String], default: ['English'] },
  companyDescription: { type: String, default: 'No company description provided' },
}, { timestamps: true });

// Hash the password before saving the user
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to validate password
UserSchema.methods.isValidPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
