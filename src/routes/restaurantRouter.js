const express = require("express");
const Menu = require("../models/Menu");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const { userAuth } = require("../middlewares/auth");
const restaurantRouter = express.Router();

const isAdmin = (req, res, next) => {
    try {
        const { role } = req.user;
        if (role !== "admin" && role !== "restaurant") {
            throw new Error("Invalid Authorization");
        }
        next()
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
}

restaurantRouter.post("/restaurant/register", async (req, res) => {
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

restaurantRouter.post("/reataurant/login", async (req, res) => {
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

restaurantRouter.get("/restaurant/:userId", userAuth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findAll( {owner: req.params.userId} );
        res.json({ message: "Restaurant Found !!!", data: restaurant });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.patch("/restaurent/:restaurantId", userAuth, async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { restaurantName, address, cuisineType, openingHours, deliveryZone } = req.body;

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



restaurantRouter.get("/menu/:restaurantId", userAuth, async (req, res) => {
    try {
        const menu = await Menu.findAll( {restaurant: req.params.restaurantId} );
        res.json({ message: "List of all items in Menu", data: menu });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.post("/item", userAuth, async (req, res) => {
    try {
        const { restaurant ,itemName, description, price, availability } = req.body;

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
        const { itemName, description, price, availability  } = req.body;

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

restaurantRouter.delete("/item/:menuItemId", userAuth, async (req, res) => {

    try {
        const menu = await Menu.findById(req.params.menuItemId);
        if (!menu) {
            throw new Error("Menu Item not found to Delete!!!");
        }
        Menu.delete(menu);
    } catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.get("/orders/:restaurantId/:status", userAuth, async (req, res) => {
    try {
        const order = await Order.findAll( {restaurant: req.params.restaurantId, orderStatus: req.params.status} );
        res.json({ message: "List of all Orders with status - " + req.params.status, data: menu });
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});

restaurantRouter.patch("/order/:orderId", async (req, res) => {
    try {
        // Extract only the allowed fields from the request body
        const { orderStatus } = req.body;

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