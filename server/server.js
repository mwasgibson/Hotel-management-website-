require ("dotenv").config ();

const express = require ('express');
const cors = require ('cors');

const routes = require ('./routes/authRoutes');
const app = express ();

app.use (cors ());
app.use (express.json ());
app.use ('/api/auth', routes);

app.get ("/", (req, res) => {
    res.send ("Hotel Management System API");
});

const PORT = 3000;

app.listen (PORT, () => {
    console.log (`Server is running on port ${PORT}`);
});