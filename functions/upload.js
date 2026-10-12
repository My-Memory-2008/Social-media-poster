export async function onRequestPost(context) {
  const { request, env } = context;
  
  const GITHUB_TOKEN = env.GITHUB_TOKEN; 
  
  if (!GITHUB_TOKEN) {
    // Return JSON error instead of plain text
    return new Response(JSON.stringify({ 
      error: 'Missing GITHUB_TOKEN in Cloudflare environment',
      hint: 'Check Cloudflare Pages Settings > Environment Variables'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const path = formData.get('path');
    const message = formData.get('message') || 'Upload via Auto-Poster';

    if (!file || !path) {
      return new Response(JSON.stringify({ error: 'Missing file or path parameter' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file size (Cloudflare limit is ~100MB)
    const fileSize = file.size;
    if (fileSize > 95 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        error: 'File too large',
        size: fileSize,
        limit: '95MB',
        hint: 'Cloudflare Functions have a ~100MB request limit. Try a smaller file.'
      }), { 
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = await file.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const owner = 'My-Memory-2008';
    const repo = 'Social-media-poster';
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const response = await fetch(githubUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: base64Content,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errText);
      } catch(e) {
        parsedError = { message: errText };
      }
      
      console.error('GitHub API Error:', parsedError);
      
      return new Response(JSON.stringify({ 
        error: 'GitHub API returned error',
        status: response.status,
        details: parsedError.message || parsedError.errors?.[0]?.message || errText,
        hint: response.status === 401 ? 'Invalid or expired GITHUB_TOKEN' :
              response.status === 403 ? 'Token missing repo scope or rate limited' :
              response.status === 422 ? 'Path may already exist or invalid filename' :
              'Unknown GitHub API error'
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, path: path }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (e) {
    console.error('Upload function error:', e);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: e.message,
      stack: e.stack
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
