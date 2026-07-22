const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:password@cluster0.mongodb.net/quizdb';

const initialUsers = [
    {
        name: 'Main Owner',
        email: 'owner@example.com',      // আপনার Owner Email দিন
        password: 'ownerpassword123',     // আপনার Owner Password দিন
        role: 'owner'
    },
    {
        name: 'Admin One',
        email: 'admin1@example.com',     // ১ নম্বর Admin Email
        password: 'adminpassword1',      // ১ নম্বর Admin Password
        role: 'admin'
    },
    {
        name: 'Admin Two',
        email: 'admin2@example.com',     // ২ নম্বর Admin Email
        password: 'adminpassword2',      // ২ নম্বর Admin Password
        role: 'admin'
    }
];

async function seedSystemUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB...');

        for (const userData of initialUsers) {
            let existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                existingUser.role = userData.role;
                existingUser.password = await bcrypt.hash(userData.password, 10);
                await existingUser.save();
                console.log(`🔄 Updated user: ${userData.email} (${userData.role})`);
            } else {
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                const newUser = new User({
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role
                });
                await newUser.save();
                console.log(`✨ Created user: ${userData.email} (${userData.role})`);
            }
        }

        console.log('🎉 Owner & Admin account setup completed!');
        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error seeding users:', err);
    }
}

seedSystemUsers();