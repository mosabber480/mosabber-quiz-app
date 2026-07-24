const mongoose = require('mongoose');

const homeConfigSchema = new mongoose.Schema({
    sliders: [{
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        bgImage: { type: String, default: 'images/slider-01.jpg' },
        bgOpacity: { type: Number, default: 0.5 },
        btn1Text: { type: String, default: '' },
        btn1Link: { type: String, default: '' },
        btn2Text: { type: String, default: '' },
        btn2Link: { type: String, default: '' }
    }],
    demoQuizzes: [{
        title: { type: String, default: '' },
        badgeText: { type: String, default: '' },
        desc: { type: String, default: '' },
        link: { type: String, default: '' }
    }],
    packages: [{
        title: { type: String, default: '' },
        price: { type: String, default: '' },
        duration: { type: String, default: '' },
        desc: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        buyLink: { type: String, default: '' }
    }]
}, { timestamps: true });

module.exports = mongoose.model('HomeConfig', homeConfigSchema);