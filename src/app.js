const express = require('express');
const app = express();
const connectDatabase = require('./configuration/databaseConnect');
require('dotenv').config();
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/adminRouter");
const customerRouter = require("./routes/customerRouter");
//const deliveryRouter = require("./routes/deliveryRouter");
const deliveryRoutes = require("./routes/deliveryRoutes");
const restaurantRouter = require("./routes/restaurantRouter");

app.use(express.json());
app.use(cookieParser());

app.use("/admin", adminRouter);
app.use("/customer", customerRouter);
//app.use("/delivery", deliveryRouter);
app.use("/deliveryy", deliveryRoutes);
app.use("/restaurant", restaurantRouter);
app.use("/", authRouter)


connectDatabase()
    .then(() => {
        console.log(`Database connected `);
        app.listen(process.env.PORT, () => {
            console.log(`Server is running at the port ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log(`Unable to connect to database ${err}`)
    })