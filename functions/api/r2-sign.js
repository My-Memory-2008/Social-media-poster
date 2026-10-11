export async function onRequestPost(context) {
  try {
    const { filename, contentType } = await context.request.json();
    
    // 1. Destructure your Cloudflare Storage Credentials from the Environment
    const ACCOUNT_ID = context.env.CLOUDFLARE_ACCOUNT_ID;
    const ACCESS_KEY_ID = context.env.R2_ACCESS_KEY_ID;
    const SECRET_ACCESS_KEY = context.env.R2_SECRET_ACCESS_KEY;
    const BUCKET_NAME = context.env.R2_BUCKET_NAME;
    const PUBLIC_DOMAIN = context.env.R2_PUBLIC_DOMAIN;

    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
      return new Response("Missing R2 storage credentials in Cloudflare Environment.", { status: 500 });
    }

    // Generate an isolated, unique filename to prevent namespace collision failures
    const uniqueName = `${crypto.randomUUID()}-${filename}`;

    // 2. Establish your S3-Compatible Storage Gateway URL Format
    const r2UrlStr = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${uniqueName}`;
    const url = new URL(r2UrlStr);

    // Add SigV4 Query string authentication keys for a 10-minute validity window (600s)
    const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = datetime.slice(0, 8);
    
    url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    url.searchParams.set('X-Amz-Credential', `${ACCESS_KEY_ID}/${date}/auto/s3/aws4_request`);
    url.searchParams.set('X-Amz-Date', datetime);
    url.searchParams.set('X-Amz-Expires', '600'); // 10 minutes
    url.searchParams.set('X-Amz-SignedHeaders', 'content-type;host');

    // 3. Compute Cryptographic SigV4 Signatures locally without communication lags
    const canonicalRequest = [
      'PUT',
      url.pathname,
      url.searchParams.toString(),
      `content-type:${contentType}\nhost:${url.host}\n`,
      'content-type;host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const hashedCanonicalRequest = await sha256(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      datetime,
      `${date}/auto/s3/aws4_request`,
      hashedCanonicalRequest
    ].join('\n');

    // Generate Signature Keys sequentially
    const kDate = await hmac(`AWS4${SECRET_ACCESS_KEY}`, date);
    const kRegion = await hmac(kDate, 'auto');
    const kService = await hmac(kRegion, 's3');
    const kSigning = await hmac(kService, 'aws4_request');
    const signature = bufferToHex(await hmac(kSigning, stringToSign));

    url.searchParams.set('X-Amz-Signature', signature);

    const uploadUrl = url.toString();
    const publicUrl = `https://${PUBLIC_DOMAIN}/${uniqueName}`;

    return new Response(JSON.stringify({ uploadUrl, publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

// --- High-Performance Crypto Helper Functions ---
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bufferToHex(hashBuffer);
}

async function hmac(key, data) {
  const keyBuf = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const dataBuf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, dataBuf);
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
