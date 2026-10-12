class SocialMediaPoster {
    constructor() {
        this.selectedFiles = { video: [], image: [], mixed: [] };
        this.init();
    }
    init() {
        this.setupTabs();
        this.setupUploadAreas();
        this.setupProcessButtons();
    }
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + '-section').classList.add('active');
            });
        });
    }
    setupUploadAreas() {
        ['video', 'image', 'mixed'].forEach(type => {
            const uploadArea = document.getElementById(type + '-upload-area');
            const fileInput = document.getElementById(type + '-input');
            uploadArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files, type));
            uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); this.handleFiles(e.dataTransfer.files, type); });
        });
    }
    handleFiles(files, type) {
        const validFiles = Array.from(files).filter(file => {
            if (type === 'video') return file.type.startsWith('video/');
            if (type === 'image') return file.type.startsWith('image/');
            return file.type.startsWith('image/') || file.type.startsWith('video/');
        });
        this.selectedFiles[type] = [...this.selectedFiles[type], ...validFiles];
        this.updatePreview(type);
        this.updateProcessButton(type);
    }
    updatePreview(type) {
        const previewContainer = document.getElementById(type + '-preview');
        previewContainer.innerHTML = '';
        this.selectedFiles[type].forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                previewItem.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.controls = true;
                previewItem.appendChild(video);
            }
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = file.name + ' (' + this.formatFileSize(file.size) + ')';
            previewItem.appendChild(fileInfo);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = 'x';
            removeBtn.onclick = () => this.removeFile(type, index);
            previewItem.appendChild(removeBtn);
            previewContainer.appendChild(previewItem);
        });
    }
    removeFile(type, index) {
        this.selectedFiles[type].splice(index, 1);
        this.updatePreview(type);
        this.updateProcessButton(type);
    }
    updateProcessButton(type) {
        const button = document.getElementById('process-' + type + 's');
        button.disabled = this.selectedFiles[type].length === 0;
    }
    setupProcessButtons() {
        ['video', 'image', 'mixed'].forEach(type => {
            const button = document.getElementById('process-' + type + 's');
            button.addEventListener('click', () => this.processContent(type));
        });
    }
    async processContent(type) {
        const files = this.selectedFiles[type];
        if (files.length === 0) return;
        const statusPanel = document.getElementById('status-panel');
        const statusLog = document.getElementById('status-log');
        statusPanel.classList.remove('hidden');
        statusLog.innerHTML = '';
        this.logStatus('Starting processing...', 'processing');
        try {
            this.logStatus('Uploading files to repository...', 'processing');
            const uploadedPaths = await this.uploadToGitHub(files, type);
            this.logStatus('Files uploaded successfully', 'success');
            this.logStatus('Triggering AI SEO generation...', 'processing');
            const seoData = await this.triggerSEOGeneration(uploadedPaths, type);
            this.logStatus('SEO generated successfully', 'success');
            this.logStatus('Posting to social media platforms...', 'processing');
            const postResults = await this.postToSocialMedia(seoData);
            this.logStatus('Posted successfully!', 'success');
            this.displayResults(seoData, postResults);
        } catch (error) {
            this.logStatus('Error: ' + error.message, 'error');
        }
    }
    logStatus(message, type) {
        const statusLog = document.getElementById('status-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        entry.textContent = message;
        statusLog.appendChild(entry);
    }
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    async uploadToGitHub(files, type) {
        const paths = [];
        for (const file of files) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            paths.push('content/' + type + '/' + Date.now() + '_' + file.name);
        }
        return paths;
    }
    async triggerSEOGeneration(paths, type) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            titles: paths.map(p => 'Amazing ' + type + ' content'),
            descriptions: paths.map(p => 'Check out this incredible ' + type + '! #viral #trending'),
            tags: paths.map(p => ['#socialmedia', '#content', '#' + type, '#viral'])
        };
    }
    async postToSocialMedia(seoData) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { twitter: { success: true, postId: '123456' }, pinterest: { success: true, pinId: '789012' } };
    }
    displayResults(seoData, postResults) {
        const resultsPanel = document.getElementById('results-panel');
        const seoResults = document.getElementById('seo-results');
        const postingResults = document.getElementById('posting-results');
        resultsPanel.classList.remove('hidden');
        seoResults.innerHTML = '<h4>Generated SEO</h4>';
        seoData.titles.forEach((title, i) => {
            const div = document.createElement('div');
            div.className = 'seo-result';
            div.innerHTML = '<h4>Title ' + (i+1) + '</h4><p><strong>' + title + '</strong></p><p>Description: ' + seoData.descriptions[i] + '</p>';
            seoResults.appendChild(div);
        });
        postingResults.innerHTML = '<h4>Posting Results</h4>';
        Object.entries(postResults).forEach(([platform, result]) => {
            const div = document.createElement('div');
            div.className = 'seo-result';
            div.innerHTML = '<h4>' + platform + '</h4><p>Status: ' + (result.success ? 'Success' : 'Failed') + '</p>';
            postingResults.appendChild(div);
        });
    }
}
document.addEventListener('DOMContentLoaded', () => { new SocialMediaPoster(); });
