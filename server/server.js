require('dotenv').config({});

const express = require ('express');
const cors = require ('cors');
const cookieParser = require('cookie-parser');

const routes = require ('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const paypalRoutes = require('./routes/paypalRoutes');
const app = express ();

app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use (express.json ());
app.use(cookieParser());

app.use ('/api/auth', routes);
app.use ('/api/rooms', roomRoutes);
app.use ('/api/bookings', bookingRoutes);
app.use ('/api/mpesa', mpesaRoutes);
app.use('/api/paypal', paypalRoutes);
app.use ('/api/payments', paymentRoutes);

app.get ("/", (req, res) => {
    res.send ("Hotel Management System API");
});

const PORT = process.env.PORT || 3000;

app.listen (PORT, () => {
    console.log (`Server is running on port ${PORT}`);
});