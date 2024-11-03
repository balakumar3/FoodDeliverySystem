const mongoose = require('mongoose');
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            maxLength: 45
        },
        lastName: {
            type: String,
        },
        emailId: {
            type: String,
            lowercase: true,
            required: true,
            unique: true,
            trim: true,
            validate(value) {
                if (!validator.isEmail(value)) {
                    throw new Error("Email ID is invalid : " + value);
                }
            },
        },
        password: {
            type: String,
            required: true,
            validate(value) {
                if (!validator.isStrongPassword(value)) {
                    throw new Error("Password is not strong : " + value);
                }
            },
        },
        role: {
            type: String,
            required: true,
            enum: {
                values: ["customer", "restaurant", "delivery", "admin"],
                message: `{VALUE} is a invalid role `
            },
        },
        gender: {
            type: String,
            enum: {
                values: ["male", "female", "other"],
                message: `{VALUE} is a invalid gender type`,
            },
        },
        status: {
            type: String,
            default: "active",
            enum: {
                values: ["active", "disabled"],
                message: `{VALUE} is an invalid account status`,
            },
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        deliveryAddresses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DeliveryAddress'
            }
        ],
        phoneNumber: {
            type: String
        },
    },
    {
        timestamps: true,
    }
);

userSchema.methods.getJWT = async function () {
    const user = this;
    const token = await jwt.sign({ _id: user._id }, process.env.JWT_PRIVATE_KEY, {
        expiresIn: "1d",
    });
    return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
    const user = this;
    const passwordHash = user.password;

    const isPasswordValid = await bcrypt.compare(
        passwordInputByUser,
        passwordHash
    );

    return isPasswordValid;
};

module.exports = mongoose.model("User", userSchema);