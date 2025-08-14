# File Sharing Backend

Secure file sharing backend with MongoDB storage, file uploads, text sharing, and automatic expiry.

## 🚀 Features

- **File Uploads**: Support for any file type, up to 1GB
- **Text Sharing**: Share text content as files
- **Automatic Expiry**: Files expire after 10min, 1h, or 1d
- **MongoDB Storage**: Persistent storage with automatic cleanup
- **RESTful API**: Clean REST endpoints for all operations
- **No Size Limits**: Upload files of any size (configurable)
- **Preview Support**: Preview text and image files
- **CORS Enabled**: Frontend integration ready

## 📦 Installation

1. **Clone/Download** this backend folder
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   - Copy `.env` file and update `YOUR_NEW_PASSWORD` with your actual MongoDB password
   - Change other settings as needed

4. **Start the server**:
   ```bash
   # Development (with auto-restart)
   npm run dev

   # Production
   npm start
   ```

### MongoDB Setup

1. **Change your MongoDB password** immediately in Atlas dashboard
2. Update the `MONGODB_URI` in `.env` with your new password
3. Ensure your IP is whitelisted in MongoDB Atlas

## 📡 API Endpoints

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: File to upload
- filename: Custom filename
- expiry: "10" | "60" | "1440" (minutes)
- uploadType: "file"
```

### Upload Text
```
POST /api/upload-text
Content-Type: application/json

Body:
{
  "filename": "my-text",
  "textContent": "Text content here",
  "expiry": "60"
}
```

### Retrieve File Info
```
GET /api/retrieve/:filename
```

### Download File
```
GET /api/download/:filename
```

### Preview File
```
GET /api/view/:filename
```

### Health Check
```
GET /api/health
```

### Cleanup Expired Files
```
DELETE /api/cleanup
```

## 🗃️ Database Schema

```javascript
{
  filename: String,        // Lowercase unique identifier
  originalName: String,    // Original filename
  contentType: String,     // MIME type
  size: Number,           // File size in bytes
  uploadType: String,     // "file" or "text"
  fileData: Buffer,       // Binary file data (for files)
  textContent: String,    // Text content (for text)
  uploadedAt: Date,       // Upload timestamp
  expiresAt: Date         // Expiry timestamp
}
```

## 🔐 Security Features

- **Input validation** on all endpoints
- **File type checking** for security
- **Size limits** (configurable)
- **Automatic expiry** cleanup
- **CORS protection**
- **Environment variables** for sensitive data


### File Structure
```
backend/
├── server.js           # Main server file
├── models/
│   └── File.js         # MongoDB schema
├── .env               # Environment variables
├── package.json       # Dependencies
└── README.md          # This file
```



