export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { text, platforms, mediaUrl } = body;

    // Pull sensitive repo tokens from Cloudflare Environment variables
    const GITHUB_PAT = context.env.GITHUB_PAT;
    const REPO_OWNER = context.env.REPO_OWNER;
    const REPO_NAME = context.env.REPO_NAME;

    const githubPayload = {
      event_type: "instant_post", // Must match types in your .yml workflow file
      client_payload: {
        text: text,
        platforms: platforms,
        media_url: mediaUrl
      }
    };

    const response = await fetch(`https://github.com{REPO_OWNER}/${REPO_NAME}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CloudflarePagesBackend'
      },
      body: JSON.stringify(githubPayload)
    });

    if (response.status === 204) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const errorText = await response.text();
      return new Response(`GitHub API error: ${errorText}`, { status: response.status });
    }

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
