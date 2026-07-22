const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_quizapp';

// 1. REGISTER API
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // ইমেইল আগে থেকেই আছে কিনা চেক করা
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // পাসওয়ার্ড এনক্রিপ্ট (Hash) করা
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // নতুন ইউজার অবজেক্ট তৈরি
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'customer' // ডিফোল্ট কাস্টমার রোল পাবে
        });

        await user.save();

        res.status(201).json({ success: true, message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. LOGIN API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // ইউজার ডাটাবেজে আছে কিনা চেক
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid Email or Password' });
        }

        // পাসওয়ার্ড সিকিউরলি ম্যাচ করা
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Email or Password' });
        }

        // সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে কিনা চেক করা
        if (user.subscription.active && user.subscription.endDate) {
            if (new Date() > new Date(user.subscription.endDate)) {
                user.subscription.active = false;
                await user.save();
            }
        }

        // JWT টোকেন জেনারেট করা
        const payload = {
            userId: user._id,
            role: user.role,
            subscription: user.subscription
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                subscription: user.subscription
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;