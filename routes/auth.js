// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// GET /login
router.get('/login', (req, res) => {
    if (req.session.user) {
        const role = req.session.user.role;
        if (role === 'Owner') return res.redirect('/owner/dashboard');
        if (role === 'Admin') return res.redirect('/admin/dashboard');
        return res.redirect('/operator/dashboard');
    }
    res.render('login', { title: 'Login - MES System' });
});

// POST /login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query(
            `SELECT * FROM Employees WHERE Username = @u AND Is_Active = 1`,
            { u: username }
        );
        const user = result.recordset[0];
        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        // For setup: if hash is placeholder, allow password 'Admin@123'
        let valid = false;
        if (user.Password_Hash.includes('placeholder')) {
            valid = (password === 'Admin@123' || password === 'Operator@123');
        } else {
            valid = await bcrypt.compare(password, user.Password_Hash);
        }

        if (!valid) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        req.session.user = {
            id: user.Employee_ID,
            name: user.Name,
            role: user.Role,
            username: user.Username
        };

        await query(`UPDATE Employees SET Last_Login = GETDATE() WHERE Employee_ID = @id`,
            { id: user.Employee_ID });

        if (user.Role === 'Owner') return res.redirect('/owner/dashboard');
        if (user.Role === 'Admin') return res.redirect('/admin/dashboard');
        return res.redirect('/operator/dashboard');

    } catch (err) {
        console.error(err);
        req.flash('error', 'Server error. Please try again.');
        res.redirect('/login');
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// GET / redirect
router.get('/', (req, res) => res.redirect('/login'));

module.exports = router;
