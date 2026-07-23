const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_quizapp';

// 1. Verify Token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ success: false, message: 'Invalid or Expired Token' });
    }
};

// 2. Authorize Roles (Owner / Admin Check)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access Forbidden: Insufficient Permissions' });
        }
        next();
    };
};

// 3. Check Active Subscription
const checkSubscription = (req, res, next) => {
    if (req.user.role === 'owner' || req.user.role === 'admin') {
        return next();
    }

    const sub = req.user.subscription;
    if (sub && sub.active && new Date(sub.endDate) > new Date()) {
        next();
    } else {
        res.status(403).json({ 
            success: false, 
            message: 'Your subscription has expired or is inactive. Please renew your plan.' 
        });
    }
};

module.exports = { verifyToken, authorizeRoles, checkSubscription };