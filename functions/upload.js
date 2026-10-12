export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // 1. Validate environment
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ 
        error: 'Server misconfiguration',
        details: 'GITHUB_TOKEN secret is missing in Cloudflare Pages settings'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Parse form data safely
    let formData, file, path, message;
    try {
      formData = await request.formData();
      file = formData.get('file');
      path = formData.get('path');
      message = formData.get('message') || 'Auto-upload';
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request format',
        details: 'Could not parse multipart form data: ' + e.message
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!file || !path) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'Both "file" and "path" form fields are required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Check file size (Cloudflare limit ~100MB)
    if (file.size > 95 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        error: 'File too large',
        details: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Cloudflare limit is ~100MB.`
      }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Convert to base64
    const buffer = await file.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // 5. Call GitHub API
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

    // 6. Handle GitHub API errors properly
    if (!githubResponse.ok) {
      let ghError = 'Unknown GitHub error';
      try {
        const ghBody = await githubResponse.text();
        const ghJson = JSON.parse(ghBody);
        ghError = ghJson.message || ghJson.errors?.[0]?.message || ghBody;
      } catch (e) { /* ignore parse errors */ }

      return new Response(JSON.stringify({
        error: 'GitHub API rejected upload',
        status: githubResponse.status,
        details: ghError,
        hint: githubResponse.status === 401 ? 'Token invalid/expired' :
              githubResponse.status === 403 ? 'Token lacks repo scope' :
              githubResponse.status === 422 ? 'File may already exist or name invalid' :
              'See details above'
      }), { status: githubResponse.status, headers: { 'Content-Type': 'application/json' } });
    }

    // 7. Success
    return new Response(JSON.stringify({ success: true, path }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // Catch-all for ANY unexpected error
    console.error('UPLOAD FUNCTION CRASH:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: err.message,
      stack: err.stack?.split('\n')[0] // First line only
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
