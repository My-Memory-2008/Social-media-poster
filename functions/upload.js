export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // 1. Validate Token
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      console.error(' MISSING TOKEN: GITHUB_TOKEN not found in Cloudflare env');
      return new Response(JSON.stringify({ 
        error: 'Server Config Error',
        details: 'GITHUB_TOKEN secret is missing'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Parse Form Data Safely
    let formData, file, path, message;
    try {
      formData = await request.formData();
      file = formData.get('file');
      path = formData.get('path');
      message = formData.get('message') || 'Auto-upload';
      
      if (!file || !path) throw new Error('Missing file or path field');
    } catch (e) {
      console.error('❌ FORM PARSE ERROR:', e.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid Request',
        details: e.message 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Size Check (Safe limit for Cloudflare Workers)
    const MAX_SIZE = 9 * 1024 * 1024; // 9MB
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ 
        error: 'File Too Large',
        details: `${(file.size/1024/1024).toFixed(1)}MB exceeds 9MB limit`
      }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`📤 Uploading: ${path} (${(file.size/1024).toFixed(1)}KB)`);

    // 4. Convert to Base64 (Robust method for binary files)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use a chunked approach to avoid stack overflow on larger files
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, chunk);
    }
    const base64Content = btoa(binaryString);

    // 5. Upload to GitHub
    const owner = 'My-Memory-2008';
    const repo = 'Social-media-poster';
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const payload = {
      message: message,
      content: base64Content,
      branch: 'main'
    };

    const ghResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // 6. Handle GitHub Response
    if (!ghResponse.ok) {
      const ghText = await ghResponse.text();
      let ghError = ghText;
      try {
        const ghJson = JSON.parse(ghText);
        ghError = ghJson.message || JSON.stringify(ghJson.errors);
      } catch(e) {}
      
      console.error(`❌ GITHUB API ERROR [${ghResponse.status}]:`, ghError);
      
      return new Response(JSON.stringify({
        error: 'GitHub Rejected Upload',
        status: ghResponse.status,
        details: ghError
      }), { status: ghResponse.status, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await ghResponse.json();
    console.log(`✅ SUCCESS: ${path}`);
    
    return new Response(JSON.stringify({ success: true, path }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    // CATCH-ALL FOR ANY UNEXPECTED CRASH
    console.error('💥 UPLOAD FUNCTION CRASH:', err);
    console.error('Stack:', err.stack);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: err.message,
      hint: 'Check Cloudflare Function Logs for stack trace'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
