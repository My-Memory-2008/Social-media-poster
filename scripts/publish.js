import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const {
  POST_TEXT, POST_PLATFORMS, MEDIA_TYPE, MEDIA_URLS,
  TWITTER_BEARER_TOKEN, LINKEDIN_TOKEN, LINKEDIN_URN,
  REDDIT_TOKEN, REDDIT_SUBREDDIT, PINTEREST_TOKEN, PINTEREST_BOARD_ID
} = process.env;

async function run() {
  const platforms = JSON.parse(POST_PLATFORMS || '[]');
  const mediaUrls = JSON.parse(MEDIA_URLS || '[]');
  
  console.log(`🚀 Instant broadcast payload received for: ${platforms.join(', ')}`);
  
  // 1. Download media locally to the runner for the visual AI module
  const localPaths = [];
  for (let i = 0; i < mediaUrls.length; i++) {
    const filename = `temp_asset_${i}${path.extname(mediaUrls[i]).split('?')[0] || '.jpg'}`;
    console.log(`Downloading asset context locally: ${mediaUrls[i]} -> ${filename}`);
    await downloadFile(mediaUrls[i], filename);
    localPaths.push(filename);
  }

  // 2. Iterate platform loops independently to optimize platform-specific parameters
  for (const platform of platforms) {
    console.log(`\n🤖 Processing local Qwen 2.5 VL SEO Optimization for: ${platform}`);
    
    // Generate specialized content updates using local vision checks
    const optimizedContent = await generateSEOWithQwen(platform, POST_TEXT, localPaths);
    console.log(`✨ Tailored Output for ${platform}:\n"${optimizedContent}"`);

    if (platform === 'twitter') await postToTwitter(optimizedContent);
    if (platform === 'linkedin') await postToLinkedIn(optimizedContent, mediaUrls);
    if (platform === 'reddit') await postToReddit(optimizedContent, mediaUrls);
    if (platform === 'pinterest') await postToPinterest(optimizedContent, mediaUrls[0]);
  }

  // 3. Clean up temporary files from the runner workspace
  localPaths.forEach(file => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}

// Utility file streaming handler
async function downloadFile(url, dest) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

// Ollama Multi-Modal Client Communication Proxy
async function generateSEOWithQwen(platform, userIdea, filePaths) {
  const prompt = `You are a social media SEO expert. Analyze the attached media file(s) along with the user's initial idea text: "${userIdea}".
Generate an optimized post tailored exclusively for the format rules of ${platform}.
Include highly search-relevant keywords, structural presentation spacing, and natural trending hashtags.
Return ONLY the clean body text ready to copy-paste. Do not include commentary introduction lines or quotes wrapper boundaries.`;

  // Encode the first asset frame to pass context data safely to the vision LLM
  const imagesArray = [];
  if (filePaths.length > 0) {
    const base64Data = fs.readFileSync(filePaths[0]).toString("base64");
    imagesArray.push(base64Data);
  }

  try {
    const response = await fetch('http://127.0.0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-vl:3b',
        prompt: prompt,
        images: imagesArray,
        stream: false
      })
    });
    
    const json = await response.json();
    return json.response.trim();
  } catch (err) {
    console.log(`⚠️ AI Inference issue encountered. Falling back to default baseline text structure: ${err.message}`);
    return userIdea;
  }
}

// --- Platform Core Destination API Connectors ---

async function postToTwitter(text) {
  const res = await fetch('https://twitter.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text })
  });
  console.log(`X Status: ${res.status}`);
}

async function postToLinkedIn(text, mediaUrls) {
  // LinkedIn multi-image/video mapping architecture initialization
  const specificContent = {};
  if (mediaUrls.length > 0) {
    // Map array references as media attachments
    specificContent["shareCommentary"] = { text: text };
    specificContent["shareMediaCategory"] = MEDIA_TYPE === 'video' ? "VIDEO" : "IMAGE";
    specificContent["media"] = mediaUrls.map(url => ({
      status: "READY",
      originalUrl: url,
      title: { text: "Broadcast Asset Component" }
    }));
  }

  const payload = mediaUrls.length > 0 ? {
    author: LINKEDIN_URN,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": specificContent },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  } : {
    author: LINKEDIN_URN,
    commentary: text,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [] }
  };

  const endpoint = mediaUrls.length > 0 ? 'https://linkedin.com' : 'https://linkedin.com';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LINKEDIN_TOKEN}`, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`LinkedIn Status: ${res.status}`);
}

async function postToReddit(text, mediaUrls) {
  // Select standard post vs link submission model variants cleanly based on media attachment sizes
  const bodyFields = {
    sr: REDDIT_SUBREDDIT,
    title: text.slice(0, 50),
  };

  if (mediaUrls.length > 0) {
    bodyFields["kind"] = "link";
    bodyFields["url"] = mediaUrls[0]; // Point directly to R2 asset link fallback module
  } else {
    bodyFields["kind"] = "self";
    bodyFields["text"] = text;
  }

  const res = await fetch('https://reddit.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REDDIT_TOKEN}`, 'User-Agent': 'CloudflareCrossPoster/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(bodyFields)
  });
  console.log(`Reddit Status: ${res.status}`);
}

async function postToPinterest(text, singleMediaUrl) {
  const res = await fetch('https://pinterest.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINTEREST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      media_source: { source_type: 'image_url', url: singleMediaUrl || 'https://picsum.photos' },
      note: text
    })
  });
  console.log(`Pinterest Status: ${res.status}`);
}

run().catch(err => {
  console.error('Fatal Failure:', err);
  process.exit(1);
});
