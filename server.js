const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const File = require('./models/File');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files (your frontend)
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1000 * 1024 * 1024 // 1GB limit
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'File sharing backend is running' });
});

// Upload file endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { filename, expiry, uploadType } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        // Check if filename already exists and not expired
        const existingFile = await File.findOne({ 
            filename: filename.toLowerCase(),
            expiresAt: { $gt: new Date() }
        });

        if (existingFile) {
            return res.status(409).json({ error: 'Filename already exists' });
        }

        let fileData = {};

        if (uploadType === 'text') {
            const { textContent } = req.body;
            if (!textContent) {
                return res.status(400).json({ error: 'Text content is required' });
            }

            fileData = {
                filename: filename.toLowerCase(),
                originalName: `${filename}.txt`,
                contentType: 'text/plain',
                textContent: textContent,
                size: textContent.length,
                uploadType: 'text',
                expiresAt: new Date(Date.now() + getExpiryMs(expiry))
            };
        } else {
            if (!req.file) {
                return res.status(400).json({ error: 'File is required' });
            }

            fileData = {
                filename: filename.toLowerCase(),
                originalName: req.file.originalname,
                contentType: req.file.mimetype,
                fileData: req.file.buffer,
                size: req.file.size,
                uploadType: 'file',
                expiresAt: new Date(Date.now() + getExpiryMs(expiry))
            };
        }

        const file = new File(fileData);
        await file.save();

        res.json({ 
            success: true, 
            message: `Uploaded ${fileData.originalName} successfully!`,
            filename: fileData.originalName
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Upload text endpoint
app.post('/api/upload-text', async (req, res) => {
    try {
        const { filename, textContent, expiry } = req.body;

        if (!filename || !textContent) {
            return res.status(400).json({ error: 'Filename and text content are required' });
        }

        // Check if filename already exists
        const existingFile = await File.findOne({ 
            filename: filename.toLowerCase(),
            expiresAt: { $gt: new Date() }
        });

        if (existingFile) {
            return res.status(409).json({ error: 'Filename already exists' });
        }

        const file = new File({
            filename: filename.toLowerCase(),
            originalName: `${filename}.txt`,
            contentType: 'text/plain',
            textContent: textContent,
            size: textContent.length,
            uploadType: 'text',
            expiresAt: new Date(Date.now() + getExpiryMs(expiry))
        });

        await file.save();

        res.json({ 
            success: true, 
            message: `Uploaded ${filename}.txt successfully!`,
            filename: `${filename}.txt`
        });

    } catch (error) {
        console.error('Text upload error:', error);
        res.status(500).json({ error: 'Text upload failed' });
    }
});

// Retrieve file metadata endpoint
app.get('/api/retrieve/:filename', async (req, res) => {
    try {
        const filename = req.params.filename.toLowerCase();

        const file = await File.findOne({ filename });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file has expired
        if (file.expiresAt < new Date()) {
            await File.deleteOne({ _id: file._id });
            return res.status(404).json({ error: 'File has expired' });
        }

        // Return file metadata
        res.json({
            originalName: file.originalName,
            contentType: file.contentType,
            size: file.size,
            uploadType: file.uploadType,
            expiresAt: file.expiresAt,
            uploadedAt: file.uploadedAt
        });

    } catch (error) {
        console.error('Retrieve error:', error);
        res.status(500).json({ error: 'Retrieve failed' });
    }
});

// Download file endpoint
app.get('/api/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename.toLowerCase();

        const file = await File.findOne({ filename });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file has expired
        if (file.expiresAt < new Date()) {
            await File.deleteOne({ _id: file._id });
            return res.status(404).json({ error: 'File has expired' });
        }

        res.set({
            'Content-Type': file.contentType,
            'Content-Disposition': `attachment; filename="${file.originalName}"`,
            'Content-Length': file.size
        });

        if (file.uploadType === 'text') {
            res.send(file.textContent);
        } else {
            res.send(file.fileData);
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// View file endpoint (for preview)
app.get('/api/view/:filename', async (req, res) => {
    try {
        const filename = req.params.filename.toLowerCase();

        const file = await File.findOne({ filename });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file has expired
        if (file.expiresAt < new Date()) {
            await File.deleteOne({ _id: file._id });
            return res.status(404).json({ error: 'File has expired' });
        }

        if (file.uploadType === 'text') {
            res.json({ content: file.textContent });
        } else if (file.contentType.startsWith('text/') || file.contentType === 'application/json') {
            res.json({ content: file.fileData.toString() });
        } else if (file.contentType.startsWith('image/')) {
            const base64 = file.fileData.toString('base64');
            res.json({ 
                content: `data:${file.contentType};base64,${base64}`,
                type: 'image'
            });
        } else {
            res.json({ 
                content: `File size: ${formatFileSize(file.size)}`,
                type: 'info'
            });
        }

    } catch (error) {
        console.error('View error:', error);
        res.status(500).json({ error: 'View failed' });
    }
});

// Cleanup expired files endpoint
app.delete('/api/cleanup', async (req, res) => {
    try {
        const result = await File.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        res.json({ 
            message: `Cleaned up ${result.deletedCount} expired files` 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// Get all files endpoint (for admin)
app.get('/api/files', async (req, res) => {
    try {
        const files = await File.find({ expiresAt: { $gt: new Date() } })
            .select('-fileData -textContent')
            .sort({ uploadedAt: -1 });

        res.json({ files });
    } catch (error) {
        console.error('Get files error:', error);
        res.status(500).json({ error: 'Failed to get files' });
    }
});

// Helper functions
function getExpiryMs(expiry) {
    const expiryMap = {
        '10': 10 * 60 * 1000,    // 10 minutes
        '60': 60 * 60 * 1000,    // 1 hour  
        '1440': 24 * 60 * 60 * 1000 // 1 day
    };
    return expiryMap[expiry] || expiryMap['60']; // Default 1 hour
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cleanup expired files every hour
setInterval(async () => {
    try {
        const result = await File.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        if (result.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${result.deletedCount} expired files`);
        }
    } catch (error) {
        console.error('Auto cleanup error:', error);
    }
}, 60 * 60 * 1000); // 1 hour

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 File sharing API ready at http://localhost:${PORT}/api`);
});

module.exports = app;
