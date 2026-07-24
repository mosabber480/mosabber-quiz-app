const express = require('express');
const router = express.Router();
const HomeConfig = require('../models/HomeConfig');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// GET /api/home-config (Publicly Accessible)
router.get('/', async (req, res) => {
    try {
        let config = await HomeConfig.findOne();
        if (!config) {
            config = { 
                sliders: [], 
                demoQuizzes: [], 
                packages: [], 
                demoSectionInfo: { title: '', subtitle: '' },
                packageSectionInfo: { title: '', subtitle: '' }
            };
        }
        res.status(200).json(config);
    } catch (err) {
        console.error("Fetch HomeConfig Error:", err);
        res.status(500).json({ success: false, message: 'Server error occurred' });
    }
});

// POST /api/home-config (Owner & Admin only)
router.post('/', verifyToken, authorizeRoles('owner', 'admin'), async (req, res) => {
    try {
        const { sliders, demoQuizzes, packages, demoSectionInfo, packageSectionInfo } = req.body;

        let config = await HomeConfig.findOne();
        if (config) {
            config.sliders = sliders || [];
            config.demoQuizzes = demoQuizzes || [];
            config.packages = packages || [];
            config.demoSectionInfo = demoSectionInfo || { title: '', subtitle: '' };
            config.packageSectionInfo = packageSectionInfo || { title: '', subtitle: '' };
            await config.save();
        } else {
            config = await HomeConfig.create({
                sliders: sliders || [],
                demoQuizzes: demoQuizzes || [],
                packages: packages || [],
                demoSectionInfo: demoSectionInfo || { title: '', subtitle: '' },
                packageSectionInfo: packageSectionInfo || { title: '', subtitle: '' }
            });
        }

        res.status(200).json({ success: true, message: 'Home config saved successfully!', config });
    } catch (err) {
        console.error("Save HomeConfig Error:", err);
        res.status(500).json({ success: false, message: 'Failed to save config: ' + err.message });
    }
});

module.exports = router;