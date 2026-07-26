require('dotenv').config({});

const express = require ('express');
const cors = require ('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const hpp = require('hpp');

const routes = require ('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const mpesaRoutes = require('./routes/mpesaRoutes');
const paypalRoutes = require('./routes/paypalRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const dealsRoutes = require('./routes/dealsRoutes');
const eventRoutes = require('./routes/eventRoutes');

const expireStaleReservations = require('./utils/expireReservations');
const sendCheckInReminders = require('./utils/sendCheckInReminders');

const { apiLimiter, authLimiter } = require('./middleware/rateLimiters');

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
app.use(helmet());
app.use(hpp());
app.use (express.json ());
app.use(cookieParser());

app.use('/api', apiLimiter);
app.use ('/api/auth', routes);
app.use ('/api/rooms', roomRoutes);
app.use ('/api/bookings', bookingRoutes);
app.use ('/api/mpesa', mpesaRoutes);
app.use('/api/paypal', paypalRoutes);
app.use ('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/events', eventRoutes);

app.get ("/", (req, res) => {
    res.send ("Hotel Management System API");
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);   // full detail stays in your server logs
    res.status(500).json({ error: 'Something went wrong' });   // client only ever sees this
});

const REQUIRED_ENV_VARS = ['PORT', 'JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'EMAIL_USER', 'EMAIL_PASS', 'CLIENT_URL'];

const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen (PORT, () => {
    console.log (`Server is running on port ${PORT}`);
});

expireStaleReservations();
setInterval(expireStaleReservations, 5 * 60 * 1000);

sendCheckInReminders();
setInterval(sendCheckInReminders, 60 * 60 * 1000);