export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Pull your saved secrets seamlessly from Cloudflare Pages Environment Variables
    const GITHUB_PAT = context.env.GITHUB_PAT;
    const REPO_OWNER = context.env.REPO_OWNER;
    const REPO_NAME = context.env.REPO_NAME;

    if (!GITHUB_PAT || !REPO_OWNER || !REPO_NAME) {
      return new Response("Missing GitHub variables in Cloudflare dashboard settings.", { status: 500 });
    }

    const payload = {
      event_type: "instant_post",
      client_payload: {
        text: body.text,
        platforms: body.platforms,
        mediaType: body.mediaType,
        files: body.files
      }
    };

    // Server-to-server request (Bypasses all browser CORS and header blocks completely)
    const response = await fetch(`https://github.com{REPO_OWNER}/${REPO_NAME}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CloudflarePagesBackendRouter'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 204) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      const errText = await response.text();
      return new Response(`GitHub API error: ${errText}`, { status: response.status });
    }

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
