const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    deliveryPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickupTime: { type: Date },
    deliveryTime: { type: Date },
    deliveryStatus: { type: String, enum: ['Pending', 'PickedUp', 'EnRoute', 'Delivered'], default: 'Pending' }
});

module.exports = mongoose.model("Delivery", deliverySchema);