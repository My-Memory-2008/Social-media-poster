export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Validate token exists
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ 
        error: 'Server misconfiguration',
        details: 'GITHUB_TOKEN secret missing in Cloudflare Pages settings'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path');
    const message = formData.get('message') || 'Auto-upload';

    if (!file || !path) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'Both "file" and "path" are required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // CRITICAL: Check file size BEFORE processing (Cloudflare limit is 10MB for Workers)
    const MAX_SIZE = 9 * 1024 * 1024; // 9MB safe limit
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return new Response(JSON.stringify({ 
        error: 'File too large for direct upload',
        details: `File is ${sizeMB}MB. Maximum allowed is 9MB via Cloudflare Functions.`,
        hint: 'For larger files, use GitHub CLI or Git LFS instead.'
      }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Upload to GitHub
    const githubUrl = `https://api.github.com/repos/My-Memory-2008/Social-media-poster/contents/${path}`;
    const githubResponse = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        content: base64Content,
        branch: 'main'
      })
    });

    if (!githubResponse.ok) {
      let ghError = 'Unknown GitHub error';
      try {
        const ghBody = await githubResponse.text();
        const ghJson = JSON.parse(ghBody);
        ghError = ghJson.message || ghJson.errors?.[0]?.message || ghBody;
      } catch (e) {}

      return new Response(JSON.stringify({
        error: 'GitHub API rejected upload',
        status: githubResponse.status,
        details: ghError
      }), { status: githubResponse.status, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('UPLOAD FUNCTION ERROR:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: err.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
