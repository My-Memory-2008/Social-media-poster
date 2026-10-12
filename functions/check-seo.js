export async function onRequestGet(context) {
  const { request, env } = context;
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  
  // Check if seo-results/seo_latest.json exists
  const url = `https://api.github.com/repos/My-Memory-2008/Social-media-poster/contents/seo-results/seo_latest.json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const file = await response.json();
      // Fetch actual content
      const contentRes = await fetch(file.download_url);
      const seo = await contentRes.json();
      
      return new Response(JSON.stringify({ ready: true, seo: seo }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ ready: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ready: false, error: e.message }), { status: 500 });
  }
}
