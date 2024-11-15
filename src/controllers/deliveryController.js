const DeliveryPersonnel = require('../models/DeliveryPersonnel');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');

// Register Delivery Personnel
exports.registerPersonnel = async (req, res) => {
  const { name, email, password, contactDetails, vehicleType } = req.body;

  const personnelExists = await DeliveryPersonnel.findOne({ email });
  if (personnelExists) return res.status(400).json({ message: 'User already exists' });

  const personnel = await DeliveryPersonnel.create({ name, email, password, contactDetails, vehicleType });

  res.status(201).json({ id: personnel._id, token: generateToken(personnel._id) });
};

// Login Delivery Personnel
exports.loginPersonnel = async (req, res) => {
  const { email, password } = req.body;
  const personnel = await DeliveryPersonnel.findOne({ email });

  if (personnel && (await personnel.matchPassword(password))) {
    res.json({ id: personnel._id, token: generateToken(personnel._id) });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// View Available Deliveries
exports.getAvailableOrders = async (req, res) => {
  const orders = await Order.find({ status: 'pending' });
  res.json(orders);
};

// Accept Delivery
exports.acceptOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.status = 'accepted';
    order.deliveryPersonnel = req.personnel._id;
    await order.save();
    res.json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};

// Update Delivery Status
exports.updateDeliveryStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    order.status = status;
    await order.save();
    res.json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};

// Manage Availability
exports.setAvailability = async (req, res) => {
  req.personnel.isAvailable = req.body.isAvailable;
  await req.personnel.save();
  res.json(req.personnel);
};
