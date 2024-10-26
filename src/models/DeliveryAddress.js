const mongoose = require('mongoose');

const DeliveryAddressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: {
        type: String, required: true
    },
    isDefault: { type: Boolean, default: false }
});

module.exports = mongoose.model("DeliveryAddress", DeliveryAddressSchema);