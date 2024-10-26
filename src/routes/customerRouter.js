const express = require("express");
const customerRouter = express.Router();

const { validateSignUpData } = require("../utils/validation");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");


customerRouter.post("/register", async (req, res) => {
    try {
        // Validation of data
        validateSignUpData(req);

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
});

customerRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        const user = await User.findOne({ emailId: emailId });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        if (user.role !== "customer") {
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


customerRouter.post('/users/:userId/delivery-addresses', userAuth, async (req, res) => {
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

customerRouter.post("/logout", userAuth, async (req, res) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
    });
    res.send("Logout is successfull!!");
});



module.exports = customerRouter;