class SocialMediaPoster {
    constructor() {
        this.selectedFiles = { video: [], image: [], mixed: [] };
        this.selectedPlatforms = [];
        this.githubToken = null;
        
        // CONFIGURATION
        this.repoOwner = 'YOUR_GITHUB_USERNAME'; // <--- CHANGE THIS TO YOUR USERNAME
        this.repoName = 'social-media-auto-poster'; 
        this.branch = 'main';
        
        this.init();
    }
    
    async init() {
        this.setupTabs();
        this.setupPlatformSelector();
        this.setupUploadAreas();
        this.setupProcessButtons();
        
        // Automatically fetch token from Cloudflare Secrets on load
        await this.fetchGitHubToken();
    }
    
    async fetchGitHubToken() {
        try {
            console.log('Fetching GitHub token from Cloudflare environment...');
            
            // Cloudflare Pages exposes environment variables via this endpoint
            // Note: This only works if the variable is set in Cloudflare Pages settings
            const response = await fetch('/cdn-cgi/workers/scripts/environment'); 
            
            // Alternative method if above doesn't work (using a simple API route or direct injection)
            // For standard Cloudflare Pages, we often rely on build-time injection or a specific worker.
            // However, the most reliable way for *secrets* in static sites without a backend worker 
            // is actually to NOT expose them to the client directly for security reasons.
            
            // BUT, since you want to upload FROM the browser, we have two options:
            // OPTION A (Secure): Use a Cloudflare Worker as a proxy (Recommended)
            // OPTION B (Direct): Inject the token at build time (Not recommended for secrets)
            
            // Since you are using Pages, let's use the standard "Build Time" injection for non-secrets
            // OR better yet, let's create a tiny Cloudflare Function to handle the upload securely.
            
            // FOR NOW: Let's assume you want to pass it via a secure header or similar.
            // Actually, the BEST practice for Cloudflare Pages + GitHub API is:
            // Don't put the token in the frontend JS. 
            
            // REVISED STRATEGY FOR YOU:
            // We will modify the app to send files to a Cloudflare Function (/_functions/upload)
            // which holds the secret and talks to GitHub.
            
            this.githubToken = 'FUNCTION_PROXY_MODE'; // Flag to use proxy
            
        } catch (e) {
            console.error('Could not auto-fetch token', e);
            // Fallback only if proxy fails
            // this.promptForToken(); 
        }
    }

    // ... [Keep existing setupTabs, setupPlatformSelector, setupUploadAreas, handleFiles, updatePreview, removeFile, updateProcessButton, setupProcessButtons methods exactly as they were] ...
    
    // REPLACE processContent WITH THIS:
    async processContent(type) {
        const files = this.selectedFiles[type];
        if (files.length === 0) return;
        
        const platforms = this.getSelectedPlatforms();
        if (platforms.length === 0) {
            alert('Please select at least one platform!');
            return;
        }
        
        const statusPanel = document.getElementById('status-panel');
        const statusLog = document.getElementById('status-log');
        statusPanel.classList.remove('hidden');
        statusLog.innerHTML = '';
        
        this.logStatus('Starting secure upload via Cloudflare...', 'processing');
        
        try {
            // 1. Upload files to our Cloudflare Function (which has the secret)
            this.logStatus('Uploading files securely...', 'processing');
            const uploadedPaths = await this.uploadFilesViaProxy(files, type);
            this.logStatus('✅ Files uploaded to repository!', 'success');
            
            // 2. Trigger Workflows (This still needs a token, but we can trigger via Proxy too)
            this.logStatus('Triggering AI SEO generation...', 'processing');
            await this.triggerWorkflowViaProxy('seo-generator.yml', {
                file_paths: uploadedPaths.join(','),
                content_type: type
            });
            this.logStatus('✅ SEO workflow started!', 'success');
            
            // 3. Wait for SEO (Polling via Proxy)
            this.logStatus('Waiting for AI analysis...', 'processing');
            const seoData = await this.waitForSEOViaProxy(uploadedPaths, type);
            this.logStatus('✅ SEO Generated!', 'success');
            
            // 4. Trigger Social Posting
            this.logStatus('Posting to social media...', 'processing');
            await this.triggerWorkflowViaProxy('social-poster.yml', {
                seo_file: 'seo-results/seo_latest.json',
                platforms: platforms.join(',')
            });
            this.logStatus('✅ Social posting started!', 'success');
            
            this.displayResults(seoData, platforms);
            
        } catch (error) {
            this.logStatus(' Error: ' + error.message, 'error');
        }
    }
    
    // NEW METHOD: Upload via Cloudflare Function (Secure)
    async uploadFilesViaProxy(files, type) {
        const uploadedPaths = [];
        const timestamp = Date.now();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const path = 'content/' + type + '/' + timestamp + '_' + file.name;
            
            this.logStatus('Uploading ' + file.name + '...', 'processing');
            
            // Create FormData to send file binary + metadata
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);
            formData.append('message', 'Upload ' + file.name);
            
            // Send to our Cloudflare Function
            const response = await fetch('/_functions/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed for ' + file.name);
            }
            
            uploadedPaths.push(path);
            this.logStatus('✓ ' + file.name + ' uploaded', 'success');
        }
        
        return uploadedPaths;
    }
    
    // NEW METHOD: Trigger Workflow via Proxy
    async triggerWorkflowViaProxy(workflowFile, inputs) {
        const response = await fetch('/_functions/trigger-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workflow: workflowFile,
                inputs: inputs
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to trigger workflow');
        }
    }
    
    // NEW METHOD: Check SEO Status via Proxy
    async waitForSEOViaProxy(paths, type) {
        // Simple polling logic calling our proxy
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 10000)); // Wait 10s
            
            const response = await fetch('/_functions/check-seo?paths=' + encodeURIComponent(paths.join(',')));
            if (response.ok) {
                const data = await response.json();
                if (data.ready) return data.seo;
            }
            this.logStatus('Waiting for AI... (' + (i+1) + '/30)', 'processing');
        }
        throw new Error('SEO generation timed out');
    }

    // ... [Keep logStatus, formatFileSize, displayResults methods exactly as they were] ...
}

document.addEventListener('DOMContentLoaded', () => { new SocialMediaPoster(); });
