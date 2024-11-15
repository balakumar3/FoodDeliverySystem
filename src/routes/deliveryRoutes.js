const express = require('express');
const {
  registerPersonnel,
  loginPersonnel,
  getAvailableOrders,
  acceptOrder,
  updateDeliveryStatus,
  setAvailability,
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

const deliveryRoutes = express.Router();

deliveryRoutes.post('/register', registerPersonnel);
deliveryRoutes.post('/login', loginPersonnel);
deliveryRoutes.get('/orders', protect, getAvailableOrders);
deliveryRoutes.put('/orders/:id/accept', protect, acceptOrder);
deliveryRoutes.put('/orders/:id/status', protect, updateDeliveryStatus);
deliveryRoutes.put('/availability', protect, setAvailability);
deliveryRoutes.delete('/deliverypartner',protect, deleteDeliveryPartner);

module.exports = deliveryRoutes;
