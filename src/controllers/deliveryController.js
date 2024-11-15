const DeliveryPersonnel = require('../models/DeliveryPersonnel');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register Delivery Personnel
exports.registerPersonnel = async (req, res) => {
  try {
    const { name, email, password, contactDetails, vehicleType } = req.body;

    // Step 1: Validate Input
    if (!name || !email || !password || !contactDetails || !vehicleType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Step 2: Check if the user already exists
    const personnelExists = await DeliveryPersonnel.findOne({ email });
    if (personnelExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Step 3: Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Create a new Delivery Personnel
    const personnel = await DeliveryPersonnel.create({
      name,
      email,
      password: hashedPassword,
      contactDetails,
      vehicleType,
    });

    // Step 5: Send success response (No token generated here)
    res.status(201).json({
      id: personnel._id,
      message: 'Welcome! Delivery Partner registered successfully',
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000 && error.keyPattern?.email) {
      console.error('Duplicate Key Error:', error.keyValue);
      return res.status(400).json({ message: `Email ${error.keyValue.email} is already registered` });
    }

    // Log any other errors and send a generic response
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Login Delivery Personnel

exports.loginPersonnel = async (req, res) => {
  const { email, password } = req.body;

  try {
  //const personnel1 = await DeliveryPersonnel.findOne({ email: 'pin@gm.com' });
  //console.log('Stored Hashed Password:', personnel1.password);
  //console.log('Length of Hashed Password:', personnel1.password.length);

    // Step 1: Check if user exists
    const personnel = await DeliveryPersonnel.findOne({ email });

    console.log("Welcome to the Food Delivery System!");
    //console.log(email.trim().toLowerCase(), personnel.email.trim().toLowerCase());


    if (!personnel) {
      return res.status(401).json({ message: 'Invalid email ! Please SignUp via Register ' });
    }

    // Step 2: Verify the password
    const isPasswordValid = await bcrypt.compare(password, personnel.password);
    //const isPasswordValid = await bcrypt.
    if (!isPasswordValid) {
    console.log(password, personnel.password);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Step 3: Generate a JWT token
    const token = generateToken(personnel._id);

    // Step 4: Send success response with the token
    res.status(200).json({
      id: personnel._id,
      message: 'Login successful',
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
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
