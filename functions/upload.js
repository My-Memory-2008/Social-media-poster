export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Get the secret token from Cloudflare Environment Variables
  const GITHUB_TOKEN = env.GITHUB_TOKEN; 
  
  if (!GITHUB_TOKEN) {
    return new Response('Server configuration error: Missing GITHUB_TOKEN', { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const path = formData.get('path');
  const message = formData.get('message') || 'Upload via Auto-Poster';

  if (!file || !path) {
    return new Response('Missing file or path', { status: 400 });
  }

  // Convert file to Base64 for GitHub API
  const buffer = await file.arrayBuffer();
  const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  // HARDCODED REPO DETAILS
  const owner = 'My-Memory-2008';
  const repo = 'Social-media-poster';
  const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
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
      const err = await response.text();
      console.error('GitHub API Error:', err);
      return new Response(err, { status: response.status });
    }

    return new Response(JSON.stringify({ success: true, path: path }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
