const mongoose = require('mongoose');

// optional: quiet deprecation warnings
mongoose.set('strictQuery', true);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 8000,  // faster fail if network/DNS is bad
  connectTimeoutMS: 8000,
  family: 4                        // prefer IPv4; avoids some IPv6 ISP issues
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err?.message || err);
  process.exitCode = 1; // do not crash server; keep API up if you prefer
});


const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    originalName: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadType: {
        type: String,
        enum: ['file', 'text'],
        required: true
    },
    fileData: {
        type: Buffer,
        required: function() { return this.uploadType === 'file'; }
    },
    textContent: {
        type: String,
        required: function() { return this.uploadType === 'text'; }
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    }
});

// Indexes for better performance
fileSchema.index({ filename: 1 });
fileSchema.index({ expiresAt: 1 });
fileSchema.index({ uploadedAt: -1 });

// Pre-save middleware
fileSchema.pre('save', function(next) {
    if (this.isNew) {
        console.log(`💾 Saving ${this.uploadType}: ${this.originalName} (${this.size} bytes)`);
    }
    next();
});

module.exports = mongoose.model('File', fileSchema);
