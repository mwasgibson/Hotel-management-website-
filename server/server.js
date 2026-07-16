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
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const app = express ();
const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map(o => o.trim());

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (e.g. curl, Postman) and any origin in the allowed list
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use (express.json ());
app.use(cookieParser());

app.use ('/api/auth', routes);
app.use ('/api/rooms', roomRoutes);
app.use ('/api/bookings', bookingRoutes);
app.use ('/api/mpesa', mpesaRoutes);
app.use('/api/paypal', paypalRoutes);
app.use ('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

app.get ("/", (req, res) => {
    res.send ("Hotel Management System API");
});

const PORT = process.env.PORT || 3000;

app.listen (PORT, () => {
    console.log (`Server is running on port ${PORT}`);
});