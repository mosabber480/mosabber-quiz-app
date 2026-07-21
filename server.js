const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Multer Setup for Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Connection Setup
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:password@cluster0.mongodb.net/quizdb';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Question Schema & Model
const questionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: { type: [String], required: true },
    ans: { type: Number, required: true },
    explanation: { type: String, default: '' },
    category: { type: String, required: true }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

// ------------------- API ENDPOINTS -------------------

// 1. Get Questions (Filtered by Category if provided)
app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category) {
            filter.category = new RegExp(`^${category}(/|$)`, 'i');
        }
        const questions = await Question.find(filter);
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Add New Single Question
app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, explanation, category } = req.body;
        const newQuestion = new Question({ q, options, ans, explanation, category });
        await newQuestion.save();
        res.status(201).json({ success: true, data: newQuestion });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 3. Update Question
app.put('/api/questions/:id', async (req, res) => {
    try {
        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updatedQuestion });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 4. Delete Single Question
app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Question deleted' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 5. Bulk Delete Questions by Category Path
app.delete('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, error: 'Category query param is required' });
        }
        const result = await Question.deleteMany({ category: new RegExp(`^${category}(/|$)`, 'i') });
        res.json({ success: true, count: result.deletedCount });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Get Categories List
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Robust Bulk Upload CSV (Native Parsing without external streamer crashes)
app.post('/api/questions/upload-csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const categoryPath = req.body.category;
        if (!categoryPath) {
            return res.status(400).json({ success: false, error: 'Category path is required' });
        }

        // CSV File Text Extract
        const fileContent = req.file.buffer.toString('utf-8');
        const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length < 2) {
            return res.status(400).json({ success: false, error: 'CSV file must have header and at least one data row.' });
        }

        // Native CSV Row Splitter Function (Quotes Safe)
        const parseCSVLine = (text) => {
            const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|)/g;
            const values = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match.index === regex.lastIndex) regex.lastIndex++;
                let val = match[1] || '';
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1).replace(/""/g, '"');
                }
                values.push(val.trim());
            }
            if (values.length > 0 && values[values.length - 1] === '') values.pop();
            return values;
        };

        // Header Check
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

        let qIdx = headers.findIndex(h => h === 'question' || h === 'q');
        let opt0Idx = headers.findIndex(h => h === 'opt0' || h === 'option1');
        let opt1Idx = headers.findIndex(h => h === 'opt1' || h === 'option2');
        let opt2Idx = headers.findIndex(h => h === 'opt2' || h === 'option3');
        let opt3Idx = headers.findIndex(h => h === 'opt3' || h === 'option4');
        let ansIdx = headers.findIndex(h => h === 'ans' || h === 'answer');
        let expIdx = headers.findIndex(h => h === 'explanation');

        // Defaults if headers missed
        if (qIdx === -1) qIdx = 0;
        if (opt0Idx === -1) opt0Idx = 1;
        if (opt1Idx === -1) opt1Idx = 2;
        if (opt2Idx === -1) opt2Idx = 3;
        if (opt3Idx === -1) opt3Idx = 4;
        if (ansIdx === -1) ansIdx = 5;
        if (expIdx === -1) expIdx = 6;

        const results = [];

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            
            const questionText = row[qIdx];
            const opt0 = row[opt0Idx];
            const opt1 = row[opt1Idx];
            const opt2 = row[opt2Idx];
            const opt3 = row[opt3Idx];

            if (questionText && opt0 && opt1 && opt2 && opt3) {
                results.push({
                    q: questionText,
                    options: [opt0, opt1, opt2, opt3],
                    ans: parseInt(row[ansIdx] || 0),
                    explanation: row[expIdx] || "",
                    category: categoryPath
                });
            }
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid rows found in CSV file.' });
        }

        await Question.insertMany(results);
        res.json({ success: true, count: results.length });

    } catch (err) {
        console.error('CSV Upload Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));