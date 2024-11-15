const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const { userAuth } = require("../middlewares/auth");
const restaurantRouter = express.Router();

function isAdminOrRestaurant (userId) {
    try {
        if (!userId) {
            throw new Error("User ID not found in the request");
        }
        const user = User.findById(userId);
        if (!user || (user.role !== "admin" && user.role !== "restaurant")) {
            throw new Error("Invalid Authorization");
        }
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
}

restaurantRouter.post("/register", async (req, res) => {
    try {
        const { userId, restaurantName, address, cuisineType, openingHours, deliveryZone } = req.body;
        isAdminOrRestaurant(userId);
        const restaurant = new Restaurant({
            owner: userId,
            restaurantName,
            address,
            cuisineType,
            openingHours,
            deliveryZone
        })
        const savedRestaurant = await restaurant.save()
        const token = await savedUser.getJWT();
        res.cookie("token", token, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        res.json({ message: "Customer Data added successfully!", data: savedRestaurant});
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.get("/:userId", userAuth, async (req, res) => {
    try {
        isAdminOrRestaurant(req.params.userId);
        const restaurant = await Restaurant.find( {owner: req.params.userId} );
        res.json({ message: "Restaurant Found !!!", data: restaurant });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.patch("/:restaurantId", userAuth, async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { userId, restaurantName, address, cuisineType, openingHours, deliveryZone } = req.body;
        isAdminOrRestaurant(userId);
        // Prepare an update object with only the permitted fields
        const updateData = {};
        if (restaurantName) updateData['restaurantName'] = restaurantName;
        if (address) updateData['address'] = address;
        if (cuisineType) updateData['cuisineType'] = cuisineType;
        if (openingHours) updateData['openingHours'] = openingHours;
        if (deliveryZone) updateData['deliveryZone'] = deliveryZone;

        // Update the user with the filtered data
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.restaurantId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedRestaurant) {
            return res.status(404).json({ message: 'Restaurent Details not found' });
        }

        res.json(updatedRestaurant);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error });
    }
});



restaurantRouter.get("/menu/:userId/:restaurantId", userAuth, async (req, res) => {
    try {
        isAdminOrRestaurant(req.params.userId);
        const menu = await Menu.find( {restaurant: req.params.restaurantId} );
        res.json({ message: "List of all items in Menu", data: menu });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.post("/item", userAuth, async (req, res) => {
    try {
        const { userId, restaurant ,itemName, description, price, availability } = req.body;
        isAdminOrRestaurant(userId);
        const menu = new Menu({
            restaurant,
            itemName,
            description,
            price,
            availability
        });
        await menu.save();
        res.status(201).json({ message: 'Item added Successfully!!!', data: menu });

    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.patch("/item/:itemId", userAuth, async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { userId, itemName, description, price, availability  } = req.body;
        isAdminOrRestaurant(userId);
        // Prepare an update object with only the permitted fields
        const updateData = {};
        if (itemName) updateData['itemName'] = itemName;
        if (description) updateData['description'] = description;
        if (price) updateData['price'] = price;
        if (availability) updateData['availability'] = availability;

        // Update the user with the filtered data
        const updatedMenuItem = await Menu.findByIdAndUpdate(
            req.params.itemId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedRestaurant) {
            return res.status(404).json({ message: 'MenuItem not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error });
    }
});

restaurantRouter.delete("/item/:userId/:menuItemId", userAuth, async (req, res) => {

    try {
        isAdminOrRestaurant(req.params.userId);
        const menu = await Menu.findById(req.params.menuItemId);
        if (!menu) {
            throw new Error("Menu Item not found to Delete!!!");
        }
        Menu.delete(menu);
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.get("/orders/:userId/:restaurantId/:status", userAuth, async (req, res) => {
    try {
        isAdminOrRestaurant(req.params.userId);
        const order = await Order.find( {restaurant: req.params.restaurantId, orderStatus: req.params.status} );
        res.json({ message: "List of all Orders with status - " + req.params.status, data: order });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.patch("/order/:orderId", async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { userId, orderStatus } = req.body;
        isAdminOrRestaurant(userId);
        // Prepare an update object with only the permitted fields
        const updateData = {};
        if (orderStatus) updateData['orderStatus'] = orderStatus;

        // Update the user with the filtered data
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.orderId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order Details not found' });
        }

        res.json(updatedOrder);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error });
    }
});

module.exports = restaurantRouter;