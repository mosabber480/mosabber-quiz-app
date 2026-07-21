const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('Database Error:', err));

// Question Schema & Model
const QuestionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: { type: [String], required: true },
    ans: { type: Number, required: true },
    category: { type: String, required: true }
});

const Question = mongoose.model('Question', QuestionSchema, 'questions');

// ================= API ROUTES =================

// 1. Get all unique categories/pages from DB
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// 2. Get questions (All or filter by category)
app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category) filter.category = category;
        const questions = await Question.find(filter);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});

// 3. Add a new question
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, category } = req.body;
        const newQuestion = new Question({ q, options, ans: Number(ans), category });
        await newQuestion.save();
        res.status(201).json({ success: true, data: newQuestion, message: 'Question saved successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Update an existing question by ID
app.put('/api/questions/:id', async (req, res) => {
    try {
        const { q, options, ans, category } = req.body;
        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { q, options, ans: Number(ans), category },
            { new: true }
        );
        res.json({ success: true, data: updatedQuestion, message: 'Question updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Delete a single question by ID
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Question deleted successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));