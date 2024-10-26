const express = require("express");
const adminRouter = express.Router();
const { validateSignUpData } = require("../utils/validation");
const User = require("../models/User");
const Order = require("../models/Order");
const DeliveryAddress = require("../models/DeliveryAddress");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");

const isAdmin = (req, res, next) => {
    try {
        const { role } = req.user;
        console.log("print req.user ", req.user);
        if (role !== "admin") {
            throw new Error("Invalid Authorization");
        }
        next()
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
}

adminRouter.get('/generate/reports', async (req, res) => {
    try {
        // 1. Most Popular Restaurants
        const popularRestaurants = await Order.aggregate([
            {
                $group: {
                    _id: '$restaurant',
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { orderCount: -1 }
            },
            {
                $limit: 10 // Adjust the limit as needed
            }
        ]);

        // 2. Average Delivery Time
        const averageDeliveryTime = await Order.aggregate([
            {
                $match: { orderStatus: 'Delivered' }
            },
            {
                $group: {
                    _id: null,
                    averageDeliveryTime: { $avg: { $subtract: ['$deliveryTime', '$orderDate'] } }
                }
            }
        ]);

        // 3. Order Trends (e.g., daily orders)
        const dailyOrders = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        res.json({
            popularRestaurants,
            averageDeliveryTime,
            dailyOrders
        });
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

const platformHealthData = {
    activeUsers: 123,
    deliveryActivity: {
        inProgress: 50,
        completed: 100,
        delayed: 10
    },
    orderStatuses: {
        pending: 200,
        processing: 150,
        shipped: 100,
        delivered: 500
    }
};

adminRouter.get("/platform-health", (req, res) => {
    res.json(platformHealthData);
});

adminRouter.post("/register", async (req, res) => {
    try {
        // Validation of data
        validateSignUpData(req);

        const { firstName, lastName, emailId, password, role, gender } = req.body;
        if (role !== "admin") {
            throw new Error("Invalid role");
        }

        // Encrypt the password
        const passwordHash = await bcrypt.hash(password, 10);
        console.log(passwordHash);

        //   Creating a new instance of the User model
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

        res.json({ message: "Admin user Data added successfully!", data: savedUser });
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }

})

adminRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId: emailId });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        if (user.role !== "admin") {
            throw new Error("Invalid role");
        }
        if (user.status !== "active") {
            throw new Error("Customer account is not active");
        }
        const isPasswordValid = await user.validatePassword(password);

        if (isPasswordValid) {
            const token = await user.getJWT();

            res.cookie("token", token, {
                expires: new Date(Date.now() + 8 * 3600000),
            });
            res.send(user);
        } else {
            throw new Error("Invalid credentials");
        }
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});



adminRouter.post("/customer/register", userAuth, isAdmin, async (req, res) => {
    try {
        // Validation of data
        validateSignUpData(req);
        console.log("print req user ", req.user)



        const { firstName, lastName, emailId, password, role, gender } = req.body;
        if (role !== "customer") {
            throw new Error("Invalid role");
        }

        // Encrypt the password
        const passwordHash = await bcrypt.hash(password, 10);
        console.log(passwordHash);

        //   Creating a new instance of the User model
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

        res.json({ message: "Customer Data added successfully!", data: savedUser });
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
})

adminRouter.post("/logout", userAuth, isAdmin, async (req, res) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
    });
    res.send("Logout is successfull!!");
});

adminRouter.post('/users/:userId/delivery-addresses', async (req, res) => {
    try {
        // Find the user
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a new delivery address
        const newAddress = new DeliveryAddress({
            userId: user._id, // Associate new address with the user
            ...req.body // Spread the request body to populate the new address
        });

        // Enforce mandatory fields in the request body
        if (!newAddress.firstName || !newAddress.lastName || !newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.country || !newAddress.postalCode) {
            return res.status(400).json({ error: 'Missing required fields in request body' });
        }

        await newAddress.save();

        return res.status(201).json({ message: 'Delivery address created successfully', address: newAddress });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.patch('/users/:userId/delivery-addresses/:addressId', async (req, res) => {
    try {
        // Find the user and the delivery address
        const user = await User.findById(req.params.userId);
        const deliveryAddress = await DeliveryAddress.findById(req.params.addressId);

        if (!user || !deliveryAddress) {
            return res.status(404).json({ error: 'User or delivery address not found' });
        }

        // Update the delivery address fields
        deliveryAddress.firstName = req.body.firstName || deliveryAddress.firstName;
        deliveryAddress.lastName = req.body.lastName || deliveryAddress.lastName;
        deliveryAddress.addressLine1 = req.body.addressLine1 || deliveryAddress.addressLine1;
        deliveryAddress.addressLine2 = req.body.addressLine2 || deliveryAddress.addressLine2;
        deliveryAddress.city = req.body.city || deliveryAddress.city;
        deliveryAddress.state = req.body.state || deliveryAddress.state;
        deliveryAddress.country = req.body.country || deliveryAddress.country;
        deliveryAddress.postalCode = req.body.postalCode || deliveryAddress.postalCode;

        await deliveryAddress.save();

        return res.status(200).json({ message: 'Delivery address updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = adminRouter;