const express = require("express");
const customerRouter = express.Router();

const { validateSignUpData } = require("../utils/validation");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const DeliveryAddress = require("../models/DeliveryAddress");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");

// Customer Registration
customerRouter.post("/register", async (req, res) => {
    try {
        validateSignUpData(req);

        const { firstName, lastName, emailId, password, role, gender } = req.body;
        if (role !== "customer") {
            throw new Error("Invalid role");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = new User({
            firstName,
            lastName,
            emailId,
            password: passwordHash,
            role,
            gender
        });
        const savedUser = await user.save();
        const token = await savedUser.getJWT();
        res.cookie("token", token, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        res.json({ message: "Customer registered successfully!", data: savedUser });
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

// Customer Login
customerRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId });
        if (!user || user.role !== "customer" || user.status !== "active") {
            throw new Error("Invalid credentials or inactive account");
        }

        const isPasswordValid = await user.validatePassword(password);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials");
        }

        const token = await user.getJWT();
        res.cookie("token", token, {
            expires: new Date(Date.now() + 8 * 3600000),
        });

        res.json(user);
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

// Add Delivery Address
// customerRouter.post('/users/:userId/delivery-addresses', userAuth, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.userId);
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const newAddress = new DeliveryAddress({
//             userId: user._id,
//             ...req.body
//         });

//         if (!newAddress.firstName || !newAddress.lastName || !newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.country || !newAddress.postalCode) {
//             return res.status(400).json({ error: 'Missing required fields' });
//         }

//         await newAddress.save();
//         res.status(201).json({ message: 'Delivery address added successfully', address: newAddress });
//     } catch (error) {
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// Add Delivery Address

customerRouter.post('/users/:userId/delivery-addresses', userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const requiredFields = ["firstName", "lastName", "addressLine1", "city", "state", "country", "postalCode"];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        const { isDefault } = req.body;

        if (isDefault) {
            // Ensure only one default address per user
            await DeliveryAddress.updateMany(
                { userId: user._id, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        const newAddress = new DeliveryAddress({
            userId: user._id,
            ...req.body,
        });

        await newAddress.save();
        res.status(201).json({ message: 'Delivery address added successfully', address: newAddress });
    } catch (error) {
        console.error("Error saving delivery address:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Delivery Address
customerRouter.put('/users/:userId/delivery-addresses/:addressId', userAuth, async (req, res) => {
    try {
        const { userId, addressId } = req.params;
        const updatedData = { ...req.body };

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const address = await DeliveryAddress.findOne({ _id: addressId, userId: user._id });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Reset other default addresses if needed
        if (updatedData.isDefault) {
            await DeliveryAddress.updateMany(
                { userId: user._id, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        // Update the address
        Object.assign(address, updatedData);
        const savedAddress = await address.save();

        res.status(200).json({ message: 'Address updated successfully', address: savedAddress });
    } catch (error) {
        console.error('Error updating delivery address:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Delete Delivery Address
customerRouter.delete('/users/:userId/delivery-addresses/:addressId', userAuth, async (req, res) => {
    try {
        const { userId, addressId } = req.params;

        const address = await DeliveryAddress.findOneAndDelete({ _id: addressId, userId });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        res.json({ message: 'Delivery address deleted successfully' });
    } catch (error) {
        console.error("Error deleting delivery address:", error);
        res.status(500).json({ error: 'Failed to delete delivery address' });
    }
});


// Logout
customerRouter.post("/logout", userAuth, (req, res) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
    });
    res.send("Logout successful!");
});

// Browse Restaurants
customerRouter.get("/restaurants", userAuth, async (req, res) => {
    try {
        const restaurants = await Restaurant.find({});
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch restaurants" });
    }
});

// Search Menus
customerRouter.get("/restaurants/search", userAuth, async (req, res) => {
    try {
        const { query, filter } = req.query;
        const searchCriteria = { 
            $or: [
                { "menuItems.name": { $regex: query, $options: "i" } },
                { type: { $regex: filter, $options: "i" } }
            ]
        };

        const restaurants = await Restaurant.find(searchCriteria);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: "Failed to search menus" });
    }
});

// Place an Order
// customerRouter.post("/orders", userAuth, async (req, res) => {
//     try {
//         const { restaurantId, items, deliveryAddressId } = req.body;

//         const newOrder = new Order({
//             userId: req.user._id,
//             restaurantId,
//             items,
//             deliveryAddressId,
//             status: "preparing"
//         });

//         const savedOrder = await newOrder.save();
//         res.status(201).json({ message: "Order placed successfully", order: savedOrder });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to place order" });
        
        
        
//     }
// });

customerRouter.post("/orders", userAuth, async (req, res) => {
    try {
        console.log(req.body); // Check the received request body
        const { restaurantId, items, deliveryAddressId } = req.body;

        const newOrder = new Order({
            userId: req.user._id,
            restaurantId,
            items,
            deliveryAddressId,
            status: "preparing"
        });

        const savedOrder = await newOrder.save();
        res.status(201).json({ message: "Order placed successfully", order: savedOrder });
    } catch (error) {
        console.error(error); // Log the detailed error
        res.status(500).json({ error: "Failed to place order", details: error.message });
    }
});


// Track Orders
customerRouter.get("/orders/:orderId/track", userAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order || order.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json({ status: order.status });
    } catch (error) {
        res.status(500).json({ error: "Failed to track order" });
    }
});

// View Order History
customerRouter.get("/orders/history", userAuth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch order history" });
    }
});

module.exports = customerRouter;
