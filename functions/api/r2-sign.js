export async function onRequestPost(context) {
  try {
    const { filename, contentType } = await context.request.json();
    
    // R2 Bucket bindings must be linked in your Cloudflare dashboard
    const bucket = context.env.MEDIA_BUCKET;
    if (!bucket) {
      return new Response("R2 Bucket binding 'MEDIA_BUCKET' is missing.", { status: 500 });
    }

    // Generate a unique, unguessable file path
    const uniqueName = `${crypto.randomUUID()}-${filename}`;
    
    // Create an upload link that lasts for 10 minutes
    const url = await bucket.createUploadUrl(uniqueName, {
      expiresIn: 600,
      httpMethod: 'PUT',
      headers: { 'Content-Type': contentType }
    });

    // Compute the final public URL where the file can be fetched later
    const publicUrl = `https://${context.env.R2_PUBLIC_DOMAIN}/${uniqueName}`;

    return new Response(JSON.stringify({ uploadUrl: url, publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
