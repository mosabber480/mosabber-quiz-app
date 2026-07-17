const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB ডাটাবেসে কানেক্ট করা
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Database Connected Successfully!'))
    .catch((err) => console.log('Database Error:', err));

// প্রশ্নের Schema তৈরি
const QuestionSchema = new mongoose.Schema({
    q: String,
    options: [String],
    ans: Number
});

const Question = mongoose.model('Question', QuestionSchema);

// ১. ডাটাবেস থেকে সব প্রশ্ন পাওয়ার API
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// ২. ডাটাবেসে নতুন প্রশ্ন যোগ করার API
app.post('/api/questions', async (req, res) => {
    try {
        const newQuestions = req.body;
        await Question.insertMany(newQuestions);
        res.json({ message: 'Questions added successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save questions' });
    }
});

// সার্ভার চালু করা
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});