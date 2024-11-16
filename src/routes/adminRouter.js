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
        if (role !== "admin") {
            throw new Error("Invalid Authorization");
        }
        next()
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
}

adminRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId: emailId });
        if (!user) {
            throw new Error("Invalid credentials");
        }

        const isPasswordValid = await user.validatePassword(password);

        if (isPasswordValid) {
            const token = await user.getJWT();

            res.cookie("token", token, {
                expires: new Date(Date.now() + 8 * 3600000),
            });
            res.status(200).send("User login successfully");
        } else {
            throw new Error("Invalid credentials");
        }
    } catch (err) {
        res.status(400).json({ error: "ERROR : " + err.message });
    }
});

adminRouter.post("/logout", userAuth, isAdmin, async (req, res) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
    });
    const userDocument = await User.findByIdAndUpdate(req.user._id, {
        lastActiveAt: Date.now()
    }, { new: true }); // Returns the updated document
    res.status(200).send("Logout is successfull!!");
});


adminRouter.post("/register/users", userAuth, isAdmin, async (req, res) => {
    try {
        // Validation of data
        validateSignUpData(req);

        const { firstName, lastName, emailId, password, role, gender } = req.body;

        // Encrypt the password
        const passwordHash = await bcrypt.hash(password, 10);

        //   Creating a new instance of the User model
        const user = new User({
            firstName,
            lastName,
            emailId,
            password: passwordHash,
            role,
            gender
        });
        await user.save();

        res.status(201).json({ message: "User Data added successfully!" });
    } catch (err) {
        res.status(400).json({ error: "ERROR : " + err.message });
    }

});

adminRouter.patch("/users/deactivate/:userId", userAuth, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'inactive' }, { new: true });
        if (user === null) {
            throw new Error("UserId is not found ");
        }
        res.json({ message: 'User deactivated', user });
    } catch (error) {
        res.status(400).json({ error: `Error deactivating user ${error}` });
    }
});

adminRouter.patch("/users/:userId", userAuth, isAdmin, async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { phoneNumber, firstName, lastName, status } = req.body;

        // Prepare an update object with only the permitted fields
        const updateData = {};
        if (phoneNumber) updateData['phoneNumber'] = phoneNumber;
        if (firstName) updateData['firstName'] = firstName;
        if (lastName) updateData['lastName'] = lastName;
        if (status) updateData['sstatus'] = status;

        // Update the user with the filtered data
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: 'Error updating user', error });
    }
});

adminRouter.post('/users/:userId/delivery-addresses', userAuth, isAdmin, async (req, res) => {
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.patch('/users/:userId/delivery-addresses/:addressId', userAuth, isAdmin, async (req, res) => {
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
        res.status(500).json({ error: 'Internal server error' });
    }
});


adminRouter.get('/orders', userAuth, isAdmin, async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const orders = await Order.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(query);

        res.status(200).json({
            data: orders,
            page: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

adminRouter.get('/orders/:orderId', userAuth, isAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

adminRouter.post('/orders/:orderId/cancel', async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.orderStatus = 'Cancelled';
        await order.save();

        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

adminRouter.patch('/orders/:orderId/reschedule', userAuth, isAdmin, async (req, res) => {
    try {
        const { newDate } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.date = newDate;
        order.orderStatus = 'Rescheduled';
        await order.save();

        res.json({ message: 'Order rescheduled successfully', order });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reschedule order' });
    }
});

adminRouter.get('/reports/popular-restaurants', userAuth, isAdmin, async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const popularRestaurants = await Order.aggregate([
            { $group: { _id: "$restaurant", orderCount: { $sum: 1 } } },
            { $sort: { orderCount: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: "restaurants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "restaurantInfo"
                }
            },
            { $unwind: "$restaurantInfo" },
            { $project: { restaurantInfo: 1, orderCount: 1 } }
        ]);

        res.json(popularRestaurants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve popular restaurants' });
    }
});

adminRouter.get('/reports/average-delivery-time', userAuth, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchStage = {};

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const averageDeliveryTime = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    averageTime: {
                        $avg: {
                            $subtract: [
                                { $toDate: "$orderDate" },
                                { $toDate: "$createdAt" }
                            ]
                        }
                    }
                }
            }
        ]);

        if (averageDeliveryTime.length === 0) {
            return res.json({ averageDeliveryTime: 0 });
        }

        const avgTimeInMinutes = averageDeliveryTime[0]?.averageTime / 1000 / 60;
        res.json({ averageDeliveryTime: avgTimeInMinutes });
    } catch (error) {
        res.status(500).json({ error: 'Failed to calculate average delivery time' });
    }
});

adminRouter.get('/reports/order-trends', userAuth, isAdmin, async (req, res) => {
    try {
        const { interval = "day", startDate, endDate } = req.query;
        const matchStage = {};

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const groupByFormat = interval === "month" ? "%Y-%m" : "%Y-%m-%d";

        const orderTrends = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: { $toDate: "$createdAt" } } },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.json(orderTrends);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve order trends' });
    }
});

adminRouter.get('/monitor/active-users', userAuth, isAdmin, async (req, res) => {
    try {
        const { timeframe = 10 } = req.query; // timeframe in minutes
        const activeSince = new Date(Date.now() - timeframe * 60 * 1000); // timeframe in milliseconds

        const activeUserCount = await User.countDocuments({
            lastActiveAt: { $gte: activeSince }
        });

        res.json({ activeUserCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve active user count' });
    }
});

adminRouter.get('/monitor/delivery-activity', userAuth, isAdmin, async (req, res) => {
    try {
        const activeDeliveries = await Order.find({ orderStatus: "OutForDelivery" });

        res.json({
            activeDeliveryCount: activeDeliveries.length,
            activeDeliveries
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve delivery activity' });
    }
});

adminRouter.get('/monitor/order-statuses', userAuth, isAdmin, async (req, res) => {
    try {
        const orderStatusSummary = await Order.aggregate([
            { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
            { $project: { orderStatus: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        res.json(orderStatusSummary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve order statuses' });
    }
});



module.exports = adminRouter;