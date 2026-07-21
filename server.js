// 🚀 BULLETPROOF CSV UPLOAD ENDPOINT
app.post('/api/questions/upload-csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const categoryPath = req.body.category;
        if (!categoryPath) {
            return res.status(400).json({ success: false, error: 'Category path is required' });
        }

        // CSV টেক্সটকে লাইন বাই লাইন ভাগ করা
        const fileContent = req.file.buffer.toString('utf-8');
        const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length < 2) {
            return res.status(400).json({ success: false, error: 'CSV file is empty or missing data rows' });
        }

        // CSV এর কমা সেপারেটেড মান পার্স করার হেল্পার (কোটেশন হ্যান্ডেল করবে)
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

        // কলাম হেডার রিড করা (Lowercase বানিয়ে ম্যাচিং সহজ করা)
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());

        // 'question' বা 'q' কলামের ইন্ডেক্স খোঁজা
        let qIdx = headers.findIndex(h => h === 'question' || h === 'q');
        let opt0Idx = headers.findIndex(h => h === 'opt0' || h === 'option1');
        let opt1Idx = headers.findIndex(h => h === 'opt1' || h === 'option2');
        let opt2Idx = headers.findIndex(h => h === 'opt2' || h === 'option3');
        let opt3Idx = headers.findIndex(h => h === 'opt3' || h === 'option4');
        let ansIdx = headers.findIndex(h => h === 'ans' || h === 'answer');
        let expIdx = headers.findIndex(h => h === 'explanation');

        // যদি অপশন ইনডেক্স না পাওয়া যায় তবে ডিফল্ট অর্ডার ধরা (0=q, 1=opt0, 2=opt1, 3=opt2, 4=opt3, 5=ans, 6=exp)
        if (qIdx === -1) qIdx = 0;
        if (opt0Idx === -1) opt0Idx = 1;
        if (opt1Idx === -1) opt1Idx = 2;
        if (opt2Idx === -1) opt2Idx = 3;
        if (opt3Idx === -1) opt3Idx = 4;
        if (ansIdx === -1) ansIdx = 5;
        if (expIdx === -1) expIdx = 6;

        const results = [];

        // বাকি লাইনগুলো (প্রশ্ন) প্রসেস করা
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
            return res.status(400).json({ success: false, error: 'No valid rows found in CSV. Check format.' });
        }

        await Question.insertMany(results);
        res.json({ success: true, count: results.length });

    } catch (err) {
        console.error('CSV Upload Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});