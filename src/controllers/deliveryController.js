const DeliveryPersonnel = require('../models/DeliveryPersonnel');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerPersonnel = async (req, res) => {
  try {
    const { name, email, password, contactDetails, vehicleType , role } = req.body;
    if (!name || !email || !password || !contactDetails || !vehicleType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const personnelExists = await DeliveryPersonnel.findOne({ email });
    if (personnelExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Encrypt the password
    const passwordHash = await bcrypt.hash(password, 10);
    //console.log(passwordHash);
    const personnel = await DeliveryPersonnel.create({
      name,
      email,
      password: passwordHash,
      contactDetails,
      vehicleType,
      role: role || 'Delivery',
    });

    res.status(201).json({
      id: personnel._id,
      message: 'Welcome! Delivery Partner registered successfully',
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ message: `Email ${error.keyValue.email} is already registered` });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get all delivery personnel
exports.getAllDeliveryPersonnel = async (req, res) => {
  try {
    // Fetch only users with the role 'Delivery'
    const deliveryPersonnel = await DeliveryPersonnel.find({ role: 'Delivery' }).select('-password');

    // Check if there are any delivery personnel found
    if (deliveryPersonnel.length === 0) {
      return res.status(404).json({ message: 'No delivery personnel found' });
    }

    // Return the list of delivery personnel
    res.status(200).json({
      message: 'Delivery personnel fetched successfully',
      deliveryPersonnel,
    });
  } catch (error) {
    console.error('Error fetching delivery personnel:', error);
    res.status(500).json({ message: 'Failed to fetch delivery personnel' });
  }
};


exports.loginPersonnel = async (req, res) => {
  const { email, password } = req.body;

  try {

    // Find personnel by email
    const personnel = await DeliveryPersonnel.findOne({ email });

    if (!personnel) {
      return res.status(401).json({ message: 'Invalid email! Please SignUp via Register' });
    }
    // Check if user is a delivery personnel
    if (personnel.role !== 'Delivery') {
      return res.status(403).json({ message: 'Access denied. Not a delivery personnel.' });
    }

    // Use the matchPassword method to compare
    const isPasswordValid = await personnel.matchPassword(password);
    const isPasswordValid1 = await personnel.validatePassword(password);
    console.log('Password Match Result:', isPasswordValid1);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password does not match Username' });
    }

    // Increment tokenVersion to invalidate old tokens
    personnel.tokenVersion += 1;
    await personnel.save();

    // Generate a new token with the updated tokenVersion
    const token = generateToken(personnel._id, personnel.tokenVersion);

    // Send the response with the token and other information
    res.status(200).json({
      id: personnel._id,
      message: 'Login successful',
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: 'Pending' });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving available orders' });
  }
};


// Accept Delivery
exports.acceptOrder = async (req, res) => {
  try {
    // Check if personnel data is attached to the request
    if (!req.personnel) {
      return res.status(401).json({ message: 'Not authorized. Please log in.' });
    }

    // Check if delivery personnel is available
    if (!req.personnel.isAvailable) {
      return res.status(403).json({ message: 'You are currently unavailable to accept deliveries' });
    }

    // Validate the order ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    // Find the order by ID
    const order = await Order.findById(req.params.id);

    // Check if the order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order is already accepted by someone else
    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({ message: 'Order is no longer available' });
    }

    // Update the order status and assign the delivery personnel
    order.orderStatus = 'Accepted';
    order.deliveryPersonnel = req.personnel._id;
    await order.save();

    // Respond with success
    res.status(200).json({
      message: 'Order accepted successfully',
      order,
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ message: 'Error accepting order' });
  }
};


exports.updateDeliveryStatus = async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['Pending', 'Accepted', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled', 'Rescheduled'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid or missing status" });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      if (order.orderStatus === status) {
        return res.status(200).json({ message: 'Order status is already set to the requested status', order });
      }

      order.orderStatus = status;
      await order.save();
      res.json({ message: 'Order status updated successfully', order });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status' });
  }
};

exports.setAvailability = async (req, res) => {
  try {
    req.personnel.isAvailable = req.body.isAvailable;
    await req.personnel.save();
    res.json(req.personnel);
  } catch (error) {
    res.status(500).json({ message: 'Error setting availability' });
  }
};

const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Menu = require('../models/Menu');

exports.createOrder = async (req, res) => {
  try {
    const { customerId, restaurantId, items, deliveryTime } = req.body;

    if (!customerId || !restaurantId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    let totalAmount = 0;
    const orderItems = [];
    

    for (const item of items) {
      const { menuItem, quantity } = item;
      if (!menuItem || !quantity) {
        return res.status(400).json({ error: 'Invalid item details' });
      }
      

      const menuItemOut = await Menu.findById(menuItem);
      if (!menuItemOut) {
        return res.status(404).json({ error: `Menu item with ID ${menuItem} not found` });
      }

      

      const itemTotal = menuItemOut.price * quantity;
      totalAmount += itemTotal;
      

      const newOrderItem = new OrderItem({
        menuItem: menuItemOut._id,
        quantity,
        order: null,
      });
      

      orderItems.push(newOrderItem);
    }

    let deliveryDate = null;
    if (deliveryTime) {
      deliveryDate = new Date(deliveryTime);
      if (isNaN(deliveryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid deliveryTime format' });
      }
    }

    const newOrder = new Order({
      customer: customerId,
      restaurant: restaurantId,
      items: [],
      orderStatus: 'Pending',
      totalAmount,
      deliveryTime: deliveryDate,
    });

    const savedOrder = await newOrder.save();

    for (const orderItem of orderItems) {
      orderItem.order = savedOrder._id;
      await orderItem.save();
    }

    savedOrder.items = orderItems.map(item => item._id);
    await savedOrder.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order: savedOrder,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' })
    console.log(error);
  }
};
