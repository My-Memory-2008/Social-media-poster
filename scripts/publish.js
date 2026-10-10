import fetch from 'node-fetch';

const {
  POST_TEXT, POST_PLATFORMS, MEDIA_URL,
  TWITTER_BEARER_TOKEN, LINKEDIN_TOKEN, LINKEDIN_URN,
  REDDIT_TOKEN, REDDIT_SUBREDDIT, PINTEREST_TOKEN, PINTEREST_BOARD_ID
} = process.env;

async function run() {
  const platforms = JSON.parse(POST_PLATFORMS || '[]');
  console.log(`Starting publication routine for: ${platforms.join(', ')}`);

  if (platforms.includes('twitter')) await postToTwitter();
  if (platforms.includes('linkedin')) await postToLinkedIn();
  if (platforms.includes('reddit')) await postToReddit();
  if (platforms.includes('pinterest')) await postToPinterest();
}

async function postToTwitter() {
  const res = await fetch('https://twitter.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: POST_TEXT })
  });
  console.log(`Twitter Status: ${res.status} - ${await res.text()}`);
}

async function postToLinkedIn() {
  const res = await fetch('https://linkedin.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LINKEDIN_TOKEN}`, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: LINKEDIN_URN,
      commentary: POST_TEXT,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [] }
    })
  });
  console.log(`LinkedIn Status: ${res.status} - ${await res.text()}`);
}

async function postToReddit() {
  const res = await fetch('https://reddit.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REDDIT_TOKEN}`, 'User-Agent': 'GHActionsSocialScheduler/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sr: REDDIT_SUBREDDIT, kind: 'self', title: POST_TEXT.slice(0, 50), text: POST_TEXT })
  });
  console.log(`Reddit Status: ${res.status} - ${await res.text()}`);
}

async function postToPinterest() {
  const res = await fetch('https://pinterest.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PINTEREST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      media_source: { source_type: 'image_url', url: MEDIA_URL || 'https://placeholder.com' },
      note: POST_TEXT
    })
  });
  console.log(`Pinterest Status: ${res.status} - ${await res.text()}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
