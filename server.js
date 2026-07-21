const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Uploads directory setup for CSV processing
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

// --- MongoDB Database Connection ---
// Render-এ Environment Variable হিসেবে MONGO_URI থাকলে সেটা নেবে, নাহলে নিচের লিংকে কানেক্ট হবে
const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// --- Mongoose Schema & Model ---
const QuestionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: [{ type: String, required: true }],
    ans: { type: Number, required: true },
    explanation: { type: String, default: "" },
    category: { type: String, required: true }
}, { timestamps: true });

const Question = mongoose.model('Question', QuestionSchema);

// --- API ENDPOINTS ---

// 1. GET ALL QUESTIONS OR FILTER BY CATEGORY
app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category) {
            query.category = category;
        }
        const questions = await Question.find(query);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. GET ALL UNIQUE CATEGORIES
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. POST SINGLE QUESTION
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, explanation, category } = req.body;
        const newQuestion = new Question({ q, options, ans, explanation, category });
        await newQuestion.save();
        res.json({ success: true, data: newQuestion });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 4. POST CSV FILE UPLOAD (BULK INSERT)
app.post('/api/questions/upload-csv', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No CSV file uploaded!" });
    }

    const category = req.body.category;
    if (!category) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: "Category is required!" });
    }

    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            if (data.question && data.opt0 && data.opt1) {
                results.push({
                    q: data.question.trim(),
                    options: [
                        data.opt0 ? data.opt0.trim() : "",
                        data.opt1 ? data.opt1.trim() : "",
                        data.opt2 ? data.opt2.trim() : "",
                        data.opt3 ? data.opt3.trim() : ""
                    ],
                    ans: parseInt(data.ans) || 0,
                    explanation: data.explanation ? data.explanation.trim() : "",
                    category: category
                });
            }
        })
        .on('end', async () => {
            try {
                if (results.length === 0) {
                    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    return res.status(400).json({ success: false, message: "CSV file was empty or improperly formatted." });
                }

                await Question.insertMany(results);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

                res.json({ 
                    success: true, 
                    message: `Successfully added ${results.length} questions!`, 
                    count: results.length 
                });
            } catch (err) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ success: false, error: err.message });
            }
        })
        .on('error', (err) => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ success: false, error: err.message });
        });
});

// 5. DELETE A QUESTION
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Question deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});