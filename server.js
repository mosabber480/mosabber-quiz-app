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

// Schema (আপনার বর্তমান স্কিমা অনুযায়ী)
const QuestionSchema = new mongoose.Schema({
    q: String,
    options: [String],
    ans: Number
});

// কালেকশন
const Question = mongoose.model('Question', QuestionSchema, 'questions');

// ১. কুইজের প্রশ্ন পাওয়ার API (GET)
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find({});
        res.json(questions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// ২. ড্যাশবোর্ড থেকে নতুন প্রশ্ন ডাটাবেসে যোগ করার API (POST)
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans } = req.body;

        // নতুন প্রশ্ন অবজেক্ট তৈরি
        const newQuestion = new Question({
            q: q,
            options: options,
            ans: Number(ans) // নিশ্চিত করার জন্য নাম্বার-এ কনভার্ট করা হলো
        });

        // ডাটাবেসে সেভ করা
        await newQuestion.save();
        
        res.status(201).json({ success: true, message: 'প্রশ্নটি সফলভাবে ডাটাবেসে যোগ হয়েছে!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to add question' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});