// Enhanced File Sharing Application
class FileShareApp {
    constructor() {
        this.maxTextLength = 1000000;
        this.currentFile = null;
        this.currentSearchResult = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCharacterCounter();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Upload type selection
        document.querySelectorAll('input[name="uploadType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchUploadMode(e.target.value);
            });
        });

        // File input and drag & drop
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('file-drop-zone');

        if (fileInput && dropZone) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Text content character counter
        const textContent = document.getElementById('text-content');
        if (textContent) {
            textContent.addEventListener('input', () => {
                this.updateCharacterCounter();
            });
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.handleUpload();
            });
        }

        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-filename');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchFile();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchFile();
                }
            });
        }

        // File actions
        const viewBtn = document.getElementById('view-btn');
        const downloadBtn = document.getElementById('download-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                this.viewFile();
            });
        }
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadFile();
            });
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        const activeContent = document.getElementById(`${tabName}-section`);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'block';
        }

        // Clear search results when switching to retrieve tab
        if (tabName === 'retrieve') {
            this.clearSearchResults();
        }
    }

    switchUploadMode(mode) {
        const fileMode = document.getElementById('file-upload-mode');
        const textMode = document.getElementById('text-upload-mode');
        if (fileMode && textMode) {
            if (mode === 'file') {
                fileMode.classList.remove('hidden');
                fileMode.style.display = 'block';
                textMode.classList.add('hidden');
                textMode.style.display = 'none';
            } else {
                fileMode.classList.add('hidden');
                fileMode.style.display = 'none';
                textMode.classList.remove('hidden');
                textMode.style.display = 'block';
            }
        }
    }

    handleFileSelect(file) {
        if (!file) return;
        this.currentFile = file;
        this.showFilePreview(file);
        this.showToast(`File "${file.name}" selected successfully!`, 'success');
    }

    showFilePreview(file) {
        const preview = document.getElementById('file-preview');
        if (!preview) return;
        const filename = preview.querySelector('.filename');
        const filesize = preview.querySelector('.filesize');
        if (filename && filesize) {
            filename.textContent = file.name;
            filename.style.fontWeight = 'bold';
            filesize.textContent = this.formatFileSize(file.size);
        }
        preview.classList.remove('hidden');
        preview.style.display = 'block';
    }

    updateCharacterCounter() {
        const textContent = document.getElementById('text-content');
        const charCount = document.getElementById('char-count');
        const charLimit = document.getElementById('char-limit');
        if (!textContent || !charCount || !charLimit) return;
        const currentLength = textContent.value.length;
        charCount.textContent = currentLength.toLocaleString();
        if (currentLength > this.maxTextLength) {
            textContent.value = textContent.value.substring(0, this.maxTextLength);
            charCount.textContent = this.maxTextLength.toLocaleString();
        }
    }

    async handleUpload() {
        const uploadTypeEl = document.querySelector('input[name="uploadType"]:checked');
        const expiryEl = document.getElementById('expiry-duration');
        if (!uploadTypeEl || !expiryEl) {
            this.showToast('Upload configuration error', 'error');
            return;
        }
        const uploadType = uploadTypeEl.value;
        const expiryMs = parseInt(expiryEl.value);

        try {
            if (uploadType === 'file') {
                await this.uploadFile(expiryMs);
            } else {
                await this.uploadText(expiryMs);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Upload failed: ' + error.message, 'error');
        }
    }

    // 🔥 USE BACKEND API: POST to /api/upload
    async uploadFile(expiryMs) {
        if (!this.currentFile) {
            throw new Error('No file selected');
        }
        const customFilename = document.getElementById('file-filename').value.trim();
        const filename = customFilename || this.currentFile.name;

        const formData = new FormData();
        formData.append('file', this.currentFile);
        formData.append('filename', filename);
        formData.append('expiry', (expiryMs / 60000).toString()); // expiry in minutes
        formData.append('uploadType', 'file');
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Upload failed');
            this.showToast(`File "${filename}" uploaded to MongoDB!`, 'success');
            this.resetFileUpload();
        } catch (error) {
            this.showToast('Upload failed: ' + error.message, 'error');
        }
    }

    // 🔥 USE BACKEND API: POST to /api/upload-text
    async uploadText(expiryMs) {
        const textFilenameEl = document.getElementById('text-filename');
        const textContentEl = document.getElementById('text-content');
        if (!textFilenameEl || !textContentEl) {
            throw new Error('Text upload elements not found');
        }
        const textFilename = textFilenameEl.value.trim();
        const textContent = textContentEl.value;
        if (!textFilename) throw new Error('Please enter a filename');
        if (!textContent.trim()) throw new Error('Please enter some text content');
        const filename = textFilename.endsWith('.txt') ? textFilename : `${textFilename}.txt`;

        try {
            const res = await fetch('/api/upload-text', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename,
                    textContent,
                    expiry: (expiryMs / 60000).toString(),
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Upload failed');
            this.showToast(`Success "${filename}"`, 'success');
            this.resetTextUpload();
        } catch (error) {
            this.showToast('Upload failed: ' + error.message, 'error');
        }
    }

    // ======== Everything below here is unchanged, only LOCAL SEARCH (for retrieve) ========

    resetFileUpload() {
        const fileInput = document.getElementById('file-input');
        const fileFilename = document.getElementById('file-filename');
        const filePreview = document.getElementById('file-preview');
        if (fileInput) fileInput.value = '';
        if (fileFilename) fileFilename.value = '';
        if (filePreview) {
            filePreview.classList.add('hidden');
            filePreview.style.display = 'none';
        }
        this.currentFile = null;
    }

    resetTextUpload() {
        const textFilename = document.getElementById('text-filename');
        const textContent = document.getElementById('text-content');
        if (textFilename) textFilename.value = '';
        if (textContent) textContent.value = '';
        this.updateCharacterCounter();
    }

    clearSearchResults() {
        const elements = [
            'search-loading',
            'file-found',
            'file-not-found'
        ];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        });
        const searchInput = document.getElementById('search-filename');
        if (searchInput) {
            searchInput.value = '';
        }
        this.currentSearchResult = null;
    }

    // 🔥 Modified: Search via BACKEND
    async searchFile() {
        const searchInput = document.getElementById('search-filename');
        if (!searchInput) return;
        const filename = searchInput.value.trim();
        if (!filename) {
            this.showToast('Please enter a filename to search', 'error');
            return;
        }
        this.showLoadingState();

        // Call backend API
        try {
            const res = await fetch(`/api/retrieve/${encodeURIComponent(filename)}`);
            if (res.status === 404) {
                setTimeout(() => {
                    this.hideLoadingState();
                    this.showFileNotFound();
                }, 400); // Just to show the loading briefly for UX
                return;
            }
            const fileInfo = await res.json();
            setTimeout(() => {
                this.hideLoadingState();
                if (fileInfo && fileInfo.originalName) {
                    // Store results for view/download
                    this.currentSearchResult = {
                        filename,
                        originalName: fileInfo.originalName,
                        contentType: fileInfo.contentType,
                        size: fileInfo.size,
                        expiresAt: fileInfo.expiresAt,
                        uploadType: fileInfo.uploadType
                    };
                    this.showFileFound(this.currentSearchResult);
                } else {
                    this.showFileNotFound();
                }
            }, 350);
        } catch (error) {
            this.hideLoadingState();
            this.showFileNotFound();
            this.showToast('Error searching for file.', 'error');
        }
    }

    showLoadingState() {
        const loading = document.getElementById('search-loading');
        const found = document.getElementById('file-found');
        const notFound = document.getElementById('file-not-found');
        if (loading) {
            loading.classList.remove('hidden');
            loading.style.display = 'block';
        }
        if (found) {
            found.classList.add('hidden');
            found.style.display = 'none';
        }
        if (notFound) {
            notFound.classList.add('hidden');
            notFound.style.display = 'none';
        }
    }

    hideLoadingState() {
        const loading = document.getElementById('search-loading');
        if (loading) {
            loading.classList.add('hidden');
            loading.style.display = 'none';
        }
    }

    // Show result using metadata returned by backend
    showFileFound(fileRecord) {
        const elements = {
            'found-filename': fileRecord.filename,
            'found-filesize': this.formatFileSize(fileRecord.size),
            'found-filetype': fileRecord.contentType,
            'found-expiry': new Date(fileRecord.expiresAt).toLocaleString()
        };
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
                if (id === 'found-filename') {
                    element.style.fontWeight = 'bold';
                }
            }
        });

        // Update download button to include filename
        const downloadBtn = document.getElementById('download-btn');
        const downloadText = downloadBtn.querySelector('.download-text');
        if (downloadText) {
            downloadText.textContent = `Download ${fileRecord.filename}`;
        }

        const found = document.getElementById('file-found');
        const notFound = document.getElementById('file-not-found');
        if (found) {
            found.classList.remove('hidden');
            found.style.display = 'block';
        }
        if (notFound) {
            notFound.classList.add('hidden');
            notFound.style.display = 'none';
        }
    }

    showFileNotFound() {
        const found = document.getElementById('file-found');
        const notFound = document.getElementById('file-not-found');
        if (found) {
            found.classList.add('hidden');
            found.style.display = 'none';
        }
        if (notFound) {
            notFound.classList.remove('hidden');
            notFound.style.display = 'block';
        }
    }

    // AJAX preview and download via backend API
    async viewFile() {
    if (!this.currentSearchResult) return;
    const filename = this.currentSearchResult.filename;

    try {
        const res = await fetch(`/api/view/${encodeURIComponent(filename)}`);
        const data = await res.json();

        const viewerTitle = document.getElementById('viewer-title');
        const viewerContent = document.getElementById('viewer-content');
        const modal = document.getElementById('file-viewer');
        if (!viewerTitle || !viewerContent || !modal) return;

        viewerTitle.textContent = `Preview: ${filename}`;

        // Support text or image preview
        if (data && data.type === 'image') {
            viewerContent.innerHTML = `<img src="${data.content}" alt="${filename}">`;
        } 
        else if (data && data.content) {
            // Add Copy button UI
            viewerContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>Preview Content</strong>
                    <button id="copy-preview-btn" style="padding: 4px 8px; font-size: 0.9rem; cursor: pointer;">Copy</button>
                </div>
                <pre id="preview-text" style="white-space: pre-wrap;">${this.escapeHtml(data.content)}</pre>
            `;

            // Attach click listener for Copy button
            document.getElementById('copy-preview-btn').addEventListener('click', async () => {
                const text = document.getElementById('preview-text').innerText;
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        // Fallback for insecure context/older browsers
                        const tempArea = document.createElement('textarea');
                        tempArea.value = text;
                        tempArea.style.position = 'fixed';
                        tempArea.style.opacity = '0';
                        document.body.appendChild(tempArea);
                        tempArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(tempArea);
                    }
                    this.showToast('Copied to clipboard!', 'success');
                } catch (err) {
                    this.showToast('Copy failed!', 'error');
                }
            });
        } 
        else {
            viewerContent.innerHTML = `
                <div class="file-info-display" style="text-align: center; padding: 2rem;">
                    Preview not supported for this file type. Please download.
                </div>
            `;
        }

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

    } catch (error) {
        this.showToast('Preview failed: ' + error.message, 'error');
    }
}

    async downloadFile() {
        if (!this.currentSearchResult) return;
        const filename = this.currentSearchResult.filename;
        // Download via backend endpoint
        try {
            const response = await fetch(`/api/download/${encodeURIComponent(filename)}`);
            if (!response.ok) {
                this.showToast('File not found or download failed.', 'error');
                return;
            }
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = this.currentSearchResult.originalName || this.currentSearchResult.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            this.showToast(`File "${this.currentSearchResult.filename}" downloaded successfully!`, 'success');
        } catch (error) {
            this.showToast('Download failed: ' + error.message, 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }
}

// Global functions for HTML event handlers
function clearFileSelection() {
    if (window.app) {
        window.app.resetFileUpload();
    }
}

function closeViewer() {
    const modal = document.getElementById('file-viewer');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FileShareApp();
});
