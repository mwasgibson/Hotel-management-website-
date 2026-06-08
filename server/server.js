require('dotenv').config({
    path: './server/.env'
});

const express = require ('express');
const cors = require ('cors');

const routes = require ('./routes/authRoutes');
const app = express ();
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

app.use (cors ());
app.use (express.json ());
app.use ('/api/auth', routes);
app.use ('/api/rooms', roomRoutes);
app.use ('/api/bookings', bookingRoutes);

app.get ("/", (req, res) => {
    res.send ("Hotel Management System API");
});

const PORT = 3000;

app.listen (PORT, () => {
    console.log (`Server is running on port ${PORT}`);
});