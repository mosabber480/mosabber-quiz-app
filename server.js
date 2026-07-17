const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// MongoDB কানেকশন
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('Database Error:', err));

// Schema (কোনো নির্দিষ্ট কালেকশন নাম না বেঁধে Flexibly রাখা হয়েছে)
const QuestionSchema = new mongoose.Schema({}, { strict: false });

// Flexible Query Route
app.get('/api/questions', async (req, res) => {
    try {
        // ১. ডাটাবেসের সব কালেকশনের নাম চেক করা
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // ২. কালেকশন 'questions' বা প্রথম পাওয়া কালেকশন থেকে ডাটা নেওয়া
        let targetCollection = collectionNames.find(name => name.includes('question')) || collectionNames[0];

        if (!targetCollection) {
            return res.json([]);
        }

        const questions = await mongoose.connection.db.collection(targetCollection).find({}).toArray();
        res.json(questions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});