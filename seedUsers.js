require('dotenv').config(); // .env ফাইল থেকে MONGO_URI পড়ার জন্য
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // আপনার User Model পাথ

// .env থেকে URI নিবে, না পেলে হার্ডকোডেড ফলব্যাক ব্যবহার করবে
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mosabber480_db_user:lKwH9F8nO2BzxpKx@mosabber.3ajdj0u.mongodb.net/quizDB?retryWrites=true&w=majority';

const initialUsers = [
    {
        name: 'Main Owner',
        email: 'owner@example.com',      // আপনার আসল Owner Email দিন
        password: 'ownerpassword123',     // আপনার সুরক্ষিত Owner Password দিন
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
        console.log('✅ Connected to MongoDB Atlas...');

        for (const userData of initialUsers) {
            let existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                // ইউজার থাকলে তথ্য ও পাসওয়ার্ড আপডেট
                existingUser.role = userData.role;
                existingUser.password = await bcrypt.hash(userData.password, 10);
                await existingUser.save();
                console.log(`🔄 Updated existing user: ${userData.email} (${userData.role})`);
            } else {
                // নতুন ইউজার তৈরি
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                const newUser = new User({
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role
                });
                await newUser.save();
                console.log(`✨ Created new user: ${userData.email} (${userData.role})`);
            }
        }

        console.log('🎉 Owner & Admin account setup completed successfully!');
    } catch (err) {
        console.error('❌ Error seeding users:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed.');
    }
}

seedSystemUsers();