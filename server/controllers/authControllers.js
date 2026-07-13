const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password || !role) {
        return res.status(400).json({ error: 'Full name, email, password, and role are required' });
    }

    const allowedRoles = ['user', 'admin', 'receptionist'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const hashedpassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)';

        db.query(sql, [fullname, email, hashedpassword, role], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {                          
                    return res.status(409).json({ error: 'An account with this email already exists' });
                }
                console.error('Error occurred while registering user:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        console.error('Error occurred while hashing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Error occurred while fetching user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.cookie('token', token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/'
        });
    });
};

exports.profile = (req, res) => {

    const sql = 'SELECT id, fullname, email, role FROM users WHERE id =?';

    db.query(sql, [req.user.id], (err, results) => {
        if (err) {
            console.error('Error occurred while fetching user profile:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(results[0]);
    });
};