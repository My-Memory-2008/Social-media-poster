class SocialMediaPoster {
    constructor() {
        this.selectedFiles = { video: [], image: [], mixed: [] };
        this.selectedPlatforms = [];
        this.githubToken = null; // Will be set via environment or prompt
        this.repoOwner = 'YOUR_GITHUB_USERNAME'; // CHANGE THIS
        this.repoName = 'social-media-auto-poster'; // CHANGE THIS IF DIFFERENT
        this.branch = 'main';
        this.init();
    }
    
    init() {
        this.setupTabs();
        this.setupPlatformSelector();
        this.setupUploadAreas();
        this.setupProcessButtons();
        this.loadGitHubToken();
    }
    
    loadGitHubToken() {
        // Try to get token from localStorage (user can input it once)
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            this.githubToken = savedToken;
            console.log('GitHub token loaded from storage');
        } else {
            // Prompt user for token on first use
            this.promptForToken();
        }
    }
    
    promptForToken() {
        const token = prompt('Enter your GitHub Personal Access Token (with repo scope):\n\nYou can create one at:\nhttps://github.com/settings/tokens\n\nThis token will be stored locally in your browser.');
        if (token && token.startsWith('ghp_')) {
            this.githubToken = token;
            localStorage.setItem('github_token', token);
            alert('Token saved successfully!');
        } else if (token) {
            alert('Invalid token format. Token should start with "ghp_"');
        }
    }
    
    setupPlatformSelector() {
        const checkboxes = document.querySelectorAll('input[name="platform"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedPlatforms();
            });
        });
        this.updateSelectedPlatforms();
    }
    
    updateSelectedPlatforms() {
        const checkboxes = document.querySelectorAll('input[name="platform"]:checked');
        this.selectedPlatforms = Array.from(checkboxes).map(cb => cb.value);
        console.log('Selected platforms:', this.selectedPlatforms);
    }
    
    getSelectedPlatforms() {
        return this.selectedPlatforms;
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
            
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files, type);
            });
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files, type);
            });
        });
    }
    
    handleFiles(files, type) {
        const validFiles = Array.from(files).filter(file => {
            if (type === 'video') return file.type.startsWith('video/');
            if (type === 'image') return file.type.startsWith('image/');
            return file.type.startsWith('image/') || file.type.startsWith('video/');
        });
        
        if (validFiles.length === 0) {
            alert('No valid files selected!');
            return;
        }
        
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
        
        const platforms = this.getSelectedPlatforms();
        if (platforms.length === 0) {
            alert('Please select at least one platform to post to!');
            return;
        }
        
        if (!this.githubToken) {
            this.promptForToken();
            if (!this.githubToken) {
                alert('GitHub token is required to upload files!');
                return;
            }
        }
        
        const statusPanel = document.getElementById('status-panel');
        const statusLog = document.getElementById('status-log');
        statusPanel.classList.remove('hidden');
        statusLog.innerHTML = '';
        
        this.logStatus('Starting upload process...', 'processing');
        this.logStatus('Selected platforms: ' + platforms.join(', '), 'info');
        this.logStatus('Files to upload: ' + files.length, 'info');
        
        try {
            // Step 1: Upload files to GitHub
            this.logStatus('Uploading files to GitHub repository...', 'processing');
            const uploadedPaths = await this.uploadFilesToGitHub(files, type);
            this.logStatus('✅ All files uploaded successfully!', 'success');
            
            // Step 2: Trigger SEO generation workflow
            this.logStatus('Triggering AI SEO generation workflow...', 'processing');
            await this.triggerSEOWorkflow(uploadedPaths, type);
            this.logStatus('✅ SEO workflow triggered!', 'success');
            
            // Step 3: Wait for SEO to complete (polling)
            this.logStatus('Waiting for SEO generation to complete...', 'processing');
            const seoData = await this.waitForSEOCompletion(uploadedPaths, type);
            this.logStatus('✅ SEO data generated!', 'success');
            
            // Step 4: Trigger social posting workflow
            this.logStatus('Triggering social media posting workflow...', 'processing');
            await this.triggerSocialWorkflow(platforms);
            this.logStatus('✅ Social posting workflow triggered!', 'success');
            
            this.logStatus('🎉 All processes completed successfully!', 'success');
            this.displayResults(seoData, platforms);
            
        } catch (error) {
            this.logStatus('❌ Error: ' + error.message, 'error');
            console.error(error);
            alert('An error occurred: ' + error.message);
        }
    }
    
    async uploadFilesToGitHub(files, type) {
        const uploadedPaths = [];
        const timestamp = Date.now();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const path = 'content/' + type + '/' + timestamp + '_' + file.name;
            
            this.logStatus('Uploading file ' + (i+1) + '/' + files.length + ': ' + file.name, 'processing');
            
            // Convert file to base64
            const base64Content = await this.fileToBase64(file);
            
            // Upload to GitHub using API
            await this.uploadToGitHubAPI(path, base64Content, 'Upload ' + file.name);
            
            uploadedPaths.push(path);
            this.logStatus('✓ Uploaded: ' + file.name, 'success');
        }
        
        return uploadedPaths;
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove the data:image/png;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }
    
    async uploadToGitHubAPI(path, content, message) {
        const url = 'https://api.github.com/repos/' + this.repoOwner + '/' + this.repoName + '/contents/' + path;
        
        // First check if file exists (to get SHA for update)
        let sha = null;
        try {
            const checkResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': 'token ' + this.githubToken,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (checkResponse.ok) {
                const existingFile = await checkResponse.json();
                sha = existingFile.sha;
            }
        } catch (e) {
            // File doesn't exist, which is fine
        }
        
        // Prepare payload
        const payload = {
            message: message,
            content: content,
            branch: this.branch
        };
        
        if (sha) {
            payload.sha = sha;
        }
        
        // Upload file
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + this.githubToken,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error('GitHub API error: ' + (error.message || response.statusText));
        }
        
        return await response.json();
    }
    
    async triggerSEOWorkflow(filePaths, contentType) {
        const url = 'https://api.github.com/repos/' + this.repoOwner + '/' + this.repoName + '/actions/workflows/seo-generator.yml/dispatches';
        
        const payload = {
            ref: this.branch,
            inputs: {
                file_paths: filePaths.join(','),
                content_type: contentType
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'token ' + this.githubToken,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error('Failed to trigger SEO workflow: ' + (error.message || response.statusText));
        }
        
        this.logStatus('SEO workflow dispatched successfully', 'success');
    }
    
    async waitForSEOCompletion(filePaths, contentType) {
        // Poll for SEO results file
        const maxAttempts = 30; // 5 minutes max (10 second intervals)
        const pollInterval = 10000; // 10 seconds
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            this.logStatus('Checking for SEO results... (attempt ' + (attempt+1) + '/' + maxAttempts + ')', 'processing');
            
            try {
                // Check if seo-results directory has new files
                const seoDirUrl = 'https://api.github.com/repos/' + this.repoOwner + '/' + this.repoName + '/contents/seo-results';
                
                const response = await fetch(seoDirUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'token ' + this.githubToken,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    const files = await response.json();
                    const seoFiles = files.filter(f => f.name.endsWith('.json'));
                    
                    if (seoFiles.length > 0) {
                        // Get the latest SEO file
                        const latestFile = seoFiles.sort((a, b) => 
                            new Date(b.commit.sha) - new Date(a.commit.sha)
                        )[0];
                        
                        // Fetch the content
                        const contentResponse = await fetch(latestFile.download_url);
                        const seoData = await contentResponse.json();
                        
                        return seoData;
                    }
                }
            } catch (e) {
                console.log('SEO not ready yet, waiting...');
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
        throw new Error('SEO generation timed out. Please check GitHub Actions logs.');
    }
    
    async triggerSocialWorkflow(platforms) {
        const url = 'https://api.github.com/repos/' + this.repoOwner + '/' + this.repoName + '/actions/workflows/social-poster.yml/dispatches';
        
        const payload = {
            ref: this.branch,
            inputs: {
                seo_file: 'seo-results/seo_latest.json',
                platforms: platforms.join(',')
            }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'token ' + this.githubToken,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error('Failed to trigger social workflow: ' + (error.message || response.statusText));
        }
        
        this.logStatus('Social posting workflow dispatched successfully', 'success');
    }
    
    logStatus(message, type) {
        const statusLog = document.getElementById('status-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        entry.textContent = message;
        statusLog.appendChild(entry);
        statusLog.scrollTop = statusLog.scrollHeight;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    displayResults(seoData, platforms) {
        const resultsPanel = document.getElementById('results-panel');
        const seoResults = document.getElementById('seo-results');
        const postingResults = document.getElementById('posting-results');
        
        resultsPanel.classList.remove('hidden');
        
        // Display SEO results
        seoResults.innerHTML = '<h4>Generated SEO Metadata</h4>';
        if (Array.isArray(seoData)) {
            seoData.forEach((item, i) => {
                const div = document.createElement('div');
                div.className = 'seo-result';
                div.innerHTML = 
                    '<h4>Content ' + (i+1) + '</h4>' +
                    '<p><strong>Title:</strong> ' + (item.title || 'N/A') + '</p>' +
                    '<p><strong>Description:</strong> ' + (item.description || 'N/A') + '</p>' +
                    '<p><strong>Hashtags:</strong> ' + (item.hashtags || []).join(', ') + '</p>';
                seoResults.appendChild(div);
            });
        }
        
        // Display posting status
        postingResults.innerHTML = '<h4>Workflow Status</h4>';
        const div = document.createElement('div');
        div.className = 'seo-result';
        div.innerHTML = 
            '<p>✅ Files uploaded to GitHub</p>' +
            '<p>✅ SEO generation workflow triggered</p>' +
            '<p>✅ Social posting workflow triggered</p>' +
            '<p><strong>Target Platforms:</strong> ' + platforms.join(', ') + '</p>' +
            '<p><em>Check GitHub Actions tab for detailed logs</em></p>';
        postingResults.appendChild(div);
    }
}

document.addEventListener('DOMContentLoaded', () => { new SocialMediaPoster(); });
