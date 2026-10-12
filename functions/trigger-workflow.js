export async function onRequestPost(context) {
  const { request, env } = context;
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  
  const { workflow, inputs } = await request.json();
  
  const url = `https://api.github.com/repos/${env.REPO_OWNER || 'YOUR_USERNAME'}/${env.REPO_NAME || 'social-media-auto-poster'}/actions/workflows/${workflow}/dispatches`;
  
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

  if (!response.ok) return new Response('Failed to trigger', { status: 500 });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
