export async function onRequestPost(context) {
  const { request, env } = context;
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  
  if (!GITHUB_TOKEN) {
    return new Response('Server configuration error: Missing GITHUB_TOKEN', { status: 500 });
  }
  
  const { workflow, inputs } = await request.json();
  
  // HARDCODED REPO DETAILS
  const owner = 'My-Memory-2008';
  const repo = 'Social-media-poster';
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: inputs
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(err, { status: response.status });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
