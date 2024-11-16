const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPersonnelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactDetails: { type: String },
    vehicleType: { type: String },
    isAvailable: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['Delivery', 'Admin'], default: 'Delivery' },
  },
  { timestamps: true }
);

// Password Comparison Method
deliveryPersonnelSchema.methods.matchPassword = async function (enteredPassword) {

  // Compare entered password with stored hashed password
  return await bcrypt.compare(enteredPassword, this.password);
};

deliveryPersonnelSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bcrypt.compare(
      passwordInputByUser,
      passwordHash
  );

  return isPasswordValid;
};

module.exports = mongoose.model('DeliveryPersonnel', deliveryPersonnelSchema);
