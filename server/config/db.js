const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
});

connection.connect((err) => {
    if (err){
        console.error("Error connecting to the database", err);
        return;
    }
    console.log("Connected to database");
})

module.exports = connection;