const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    itemName: { type: String, required: true },
    description: {
        type: String
    },
    price: { type: Number, required: true },
    availability: {
        type: Boolean, default: true
    }
});

module.exports = mongoose.model('Menu', menuSchema);