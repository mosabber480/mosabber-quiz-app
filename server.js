const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection with your URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mosabber480_db_user:lKwH9F8nO2BzxpKx@mosabber.3ajdj0u.mongodb.net/quizDB?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.error('MongoDB Connection Error:', err));

// MCQ Question Schema & Model
const questionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: { type: [String], required: true },
    ans: { type: Number, required: true },
    explanation: { type: String, default: "" },
    category: { type: String, required: true } // Format: "main/sub/topic"
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

// --- API ROUTES ---

// 1. GET ALL QUESTIONS (FILTERED BY CATEGORY)
app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category) {
            query.category = category;
        }
        const questions = await Question.find(query);
        res.status(200).json(questions);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. GET ALL UNIQUE CATEGORY PATHS
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. POST A SINGLE MCQ QUESTION
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, explanation, category } = req.body;
        const newQuestion = new Question({ q, options, ans, explanation, category });
        await newQuestion.save();
        res.status(201).json({ success: true, data: newQuestion });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. PUT / UPDATE A SINGLE MCQ QUESTION BY ID
app.put('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedQuestion = await Question.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedQuestion });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. DELETE ALL QUESTIONS IN A SPECIFIC TOPIC/CATEGORY (BULK DELETE)
app.delete('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, message: "Category query parameter is required" });
        }

        const result = await Question.deleteMany({ category: category });
        res.status(200).json({ 
            success: true, 
            message: `Deleted ${result.deletedCount} questions under ${category}`,
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. DELETE A SINGLE QUESTION BY ID
app.delete('/api/questions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Question.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Question deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. DELETE AN ENTIRE CATEGORY OR SUBCATEGORY (PREFIX DELETE)
app.delete('/api/categories', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, message: "Category parameter is required" });
        }
        
        const regex = new RegExp(`^${category}(/|$)`);
        const result = await Question.deleteMany({ category: regex });
        
        res.status(200).json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 8. POST CSV FILE BULK UPLOAD
app.post('/api/questions/upload-csv', upload.single('file'), (req, res) => {
    const category = req.body.category;
    if (!req.file || !category) {
        return res.status(400).json({ success: false, message: "File and category are required." });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            results.push({
                q: data.Question || data.q,
                options: [
                    data.OptionA || data.opt1,
                    data.OptionB || data.opt2,
                    data.OptionC || data.opt3,
                    data.OptionD || data.opt4
                ],
                ans: parseInt(data.AnswerIndex || data.ans || 0),
                explanation: data.Explanation || data.explanation || "",
                category: category
            });
        })
        .on('end', async () => {
            try {
                await Question.insertMany(results);
                fs.unlinkSync(req.file.path);
                res.status(200).json({ success: true, count: results.length });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ success: false, error: err.message });
            }
        });
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});