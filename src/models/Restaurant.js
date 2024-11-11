const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantName: { type: String, required: true },
    address: { type: String, required: true },
    cuisineType: { type: String },
    openingHours: { type: String },
    deliveryZone: { type: String }
});


module.exports = mongoose.model('Restaurant', restaurantSchema);
