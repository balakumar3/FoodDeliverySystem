const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant',
        required: true
    },
    orderDate: { type: Date, default: Date.now },
    orderStatus: { type: String, enum: ['Pending', 'Accepted', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'], default: 'Pending' },
    totalAmount: { type: Number },
    deliveryTime: { type: Date },
});

module.exports = mongoose.model("Order", orderSchema);