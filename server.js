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

// Schema-তে category যোগ করা হলো
const QuestionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: { type: [String], required: true },
    ans: { type: Number, required: true },
    category: { type: String, required: true } // যেমন: '5.সন্ধি-বিচ্ছেদ', '2.ধ্বনি-ও-বর্ণ'
});

const Question = mongoose.model('Question', QuestionSchema, 'questions');

// ১. টপিক অনুযায়ী প্রশ্ন খোঁজা (GET)
app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category) {
            filter.category = category;
        }
        const questions = await Question.find(filter);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// ২. নতুন প্রশ্ন যোগ করা (POST)
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, category } = req.body;
        const newQuestion = new Question({ q, options, ans: Number(ans), category });
        await newQuestion.save();
        res.status(201).json({ success: true, data: newQuestion, message: 'প্রশ্নটি সফলভাবে যোগ হয়েছে!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৩. পুরানো প্রশ্ন এডিট/আপডেট করা (PUT)
app.put('/api/questions/:id', async (req, res) => {
    try {
        const { q, options, ans, category } = req.body;
        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { q, options, ans: Number(ans), category },
            { new: true }
        );
        res.json({ success: true, data: updatedQuestion, message: 'প্রশ্নটি সফলভাবে আপডেট হয়েছে!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ৪. প্রশ্ন ডিলিট করা (DELETE)
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'প্রশ্নটি ডিলিট করা হয়েছে!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));