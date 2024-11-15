const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPersonnelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactDetails: { type: String },
  vehicleType: { type: String },
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

// Password Hashing
deliveryPersonnelSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

deliveryPersonnelSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('DeliveryPersonnel', deliveryPersonnelSchema);
