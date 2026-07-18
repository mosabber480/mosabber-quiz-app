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

// Schema ঠিক করা হলো
const QuestionSchema = new mongoose.Schema({
    q: String,
    options: [String],
    ans: Number
});

// কালেকশনের নাম সরাসরি 'questions' নির্দিষ্ট করে দেওয়া হলো
const Question = mongoose.model('Question', QuestionSchema, 'questions');

// API Route ঠিক করা হলো
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find({});
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