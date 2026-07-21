const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const csvParser = require('csv-parser');
const streamifier = require('streamifier');

const app = express();
app.use(express.json());
app.use(cors());

// Multer memory storage setup for CSV upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';
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

// ---------------- API ENDPOINTS ----------------

// 1. Get Questions (Filtered by Category if query param exists)
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

// 2. Add New Question (Single)
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

// 3. Update Single Question
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

// 5. Bulk Delete Questions under a specific Category / Topic
app.delete('/api/questions', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ success: false, error: 'Category parameter is required for bulk delete' });
        }
        
        const filter = { category: new RegExp(`^${category}(/|$)`, 'i') };
        const result = await Question.deleteMany(filter);

        res.json({ success: true, count: result.deletedCount });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Get Distinct Category Paths
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Question.distinct('category');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Flexible CSV Bulk Upload Endpoint (Fixes Column Header Validation Error)
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
            .pipe(csvParser())
            .on('data', (row) => {
                // Flexible field mapping for Question Text
                const questionText = row.q || row.question || row.Question || row.Q;
                
                // Flexible mapping for Options
                const opt0 = row.opt0 || row.option1 || row.Option1 || row['option 1'];
                const opt1 = row.opt1 || row.option2 || row.Option2 || row['option 2'];
                const opt2 = row.opt2 || row.option3 || row.Option3 || row['option 3'];
                const opt3 = row.opt3 || row.option4 || row.Option4 || row['option 4'];

                if (questionText && opt0 && opt1 && opt2 && opt3) {
                    results.push({
                        q: questionText.trim(),
                        options: [opt0.trim(), opt1.trim(), opt2.trim(), opt3.trim()],
                        ans: parseInt(row.ans || row.answer || 0),
                        explanation: (row.explanation || row.Explanation || '').trim(),
                        category: categoryPath
                    });
                }
            })
            .on('end', async () => {
                if (results.length === 0) {
                    return res.status(400).json({ success: false, error: 'No valid questions found in CSV. Check column headers.' });
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
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});