const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csvParser = require('csv-parser');
const streamifier = require('streamifier');

const app = express();
app.use(express.json());
app.use(cors());

// Multer storage
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Question Model
const questionSchema = new mongoose.Schema({
    q: { type: String, required: true },
    options: { type: [String], required: true },
    ans: { type: Number, required: true },
    explanation: { type: String, default: '' },
    category: { type: String, required: true }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

// ---------------- ROUTES ----------------

app.get('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category) filter.category = new RegExp(`^${category}(/|$)`, 'i');
        const questions = await Question.find(filter);
        res.json(questions);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/questions', async (req, res) => {
    try {
        const { q, options, ans, explanation, category } = req.body;
        const newQuestion = new Question({ q, options, ans, explanation, category });
        await newQuestion.save();
        res.status(201).json({ success: true, data: newQuestion });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.put('/api/questions/:id', async (req, res) => {
    try {
        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updatedQuestion });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.delete('/api/questions/:id', async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Question deleted' });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.delete('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) return res.status(400).json({ success: false, error: 'Category required' });
        const result = await Question.deleteMany({ category: new RegExp(`^${category}(/|$)`, 'i') });
        res.json({ success: true, count: result.deletedCount });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.json(categories);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🔥 PERFECT CSV UPLOAD ENDPOINT (Accepts 'question' column Header)
app.post('/api/questions/upload-csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const categoryPath = req.body.category;
        if (!categoryPath) {
            return res.status(400).json({ success: false, error: 'Category path is required' });
        }

        const results = [];
        const fileStream = streamifier.createReadStream(req.file.buffer);

        fileStream
            .pipe(csvParser({
                mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers (lowercase & trim)
            }))
            .on('data', (row) => {
                // Get question text regardless of column name: 'question', 'q', etc.
                const questionText = row.question || row.q;
                const opt0 = row.opt0 || row.option1;
                const opt1 = row.opt1 || row.option2;
                const opt2 = row.opt2 || row.option3;
                const opt3 = row.opt3 || row.option4;

                if (questionText && opt0 && opt1 && opt2 && opt3) {
                    results.push({
                        q: questionText.trim(),
                        options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
                        ans: parseInt(row.ans || row.answer || 0),
                        explanation: (row.explanation || '').trim(),
                        category: categoryPath
                    });
                }
            })
            .on('end', async () => {
                if (results.length === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Could not read CSV questions. Make sure columns are named: question, opt0, opt1, opt2, opt3, ans, explanation' 
                    });
                }

                await Question.insertMany(results);
                res.json({ success: true, count: results.length });
            });

    } catch (err) {
        console.error('CSV Upload Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));