const express = require("express");
const { validateSignUpData } = require("../utils/validation");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const OrderItems = require("../models/OrderItem");
const { userAuth } = require("../middlewares/auth");
const restaurantRouter = express.Router();

async function isAdminOrRestaurant (userId) {
    try {
        if (!userId) {
            throw new Error("User ID not found in the request");
        }
        const user = await User.findById(userId);
        if (!user || (user.role !== "admin" && user.role !== "restaurant")) {
            throw new Error("Invalid Authorization");
        }
    }
    catch (err) {
        throw new Error(err.message);
    }
}

restaurantRouter.post("/register", async (req, res) => {
    try {
        // Validation of data
        validateSignUpData(req);
        const { firstName, lastName, emailId, password, role, gender, restaurantName, address, cuisineType, openingHours, deliveryZone } = req.body;
        if (role !== "restaurant") {
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
        const restaurant = new Restaurant({
            owner: savedUser._id,
            restaurantName,
            address,
            cuisineType,
            openingHours,
            deliveryZone
        })
        const savedRestaurant = await restaurant.save()
        // const savedUser = await user.save();
        const token = await savedUser.getJWT();
        res.cookie("token", token, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        const response = { user: savedUser, restaurant: savedRestaurant};
        res.json({ message: "Customer Data added successfully!", data: response});
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.post("/register/:userId", async (req, res) => {
    try {
        // Validation of data\
        const { restaurantName, address, cuisineType, openingHours, deliveryZone } = req.body;
        isAdminOrRestaurant(req.params.userId);

        const restaurant = new Restaurant({
            owner: req.params.userId,
            restaurantName,
            address,
            cuisineType,
            openingHours,
            deliveryZone
        })
        const savedRestaurant = await restaurant.save()

        res.json({ message: "Restaurant added successfully!", data: savedRestaurant});
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId: emailId });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        if (user.role !== "restaurant") {
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

restaurantRouter.post("/item/:userId", userAuth, async (req, res) => {
    try {
        const { restaurant ,itemName, description, price, availability } = req.body;
        isAdminOrRestaurant(req.params.userId);
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

        if (!updatedMenuItem) {
            return res.status(404).json({ message: 'MenuItem not found' });
        }

        res.json(updatedMenuItem);
    } catch (error) {
        res.status(400).json({ message: 'Error updating user', error });
    }
});

restaurantRouter.delete("/item/:userId/:menuItemId", userAuth, async (req, res) => {

    try {
        isAdminOrRestaurant(req.params.userId);
        const menuItem = await Menu.findById(req.params.menuItemId);
        if (!menuItem) {
            throw new Error("Menu Item not found to Delete!!!");
        }
        Menu.deleteOne(menuItem);
        res.status(201).json({ message: 'Menu Item Deleted Successfully!!!'});
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.get("/orders/:userId/:restaurantId/:status", userAuth, async (req, res) => {
    try {
        isAdminOrRestaurant(req.params.userId);
        const order = await Order.find( {restaurant: req.params.restaurantId, orderStatus: req.params.status} );
        console.log(Order);
        let responseObj = [];
        order.forEach((element) => {
            let itemsObject = [];
            element.items.forEach((element1) => {
                const orderItemObject = OrderItems.findById(element1);
                const menuObject = Menu.findById(orderItemObject.menuItem);
                let itemObj = {
                    item: menuObject.itemName,
                    quantity: orderItemObject.quantity
                }
                itemsObject.push(itemObj);
            })
            let orderObject = {
                id: element._id,
                customer: element.customer,
                restaurant: element.restaurant,
                orderDate: element.orderDate,
                orderStatus: element.orderStatus,
                totalAmount: element.totalAmount,
                deliveryTime: element.deliveryTime,
                items: itemsObject
            };
            responseObj.push(orderObject);
        });
        res.json({ message: "List of all Orders with status - " + req.params.status, data: responseObj });
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