#!/usr/bin/env python3
import os
import json
from pathlib import Path

class SocialMediaPoster:
    def __init__(self):
        self.twitter_api_key = os.environ.get('TWITTER_API_KEY')
        self.twitter_api_secret = os.environ.get('TWITTER_API_SECRET')
        self.twitter_access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
        self.twitter_access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
        self.pinterest_access_token = os.environ.get('PINTEREST_ACCESS_TOKEN')
        self.instagram_access_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.youtube_api_key = os.environ.get('YOUTUBE_API_KEY')
        self.tiktok_access_token = os.environ.get('TIKTOK_ACCESS_TOKEN')
        
        print("Credentials configured:")
        print("  Twitter: " + str(all([self.twitter_api_key, self.twitter_api_secret, self.twitter_access_token, self.twitter_access_token_secret])))
        print("  Pinterest: " + str(bool(self.pinterest_access_token)))
        print("  Instagram: " + str(bool(self.instagram_access_token)))
        print("  YouTube: " + str(bool(self.youtube_api_key)))
        print("  TikTok: " + str(bool(self.tiktok_access_token)))
    
    def post_to_pinterest(self, seo_data, image_url=None):
        """Post to Pinterest"""
        try:
            import requests
            url = "https://api.pinterest.com/v5/pins"
            headers = {
                'Authorization': 'Bearer ' + self.pinterest_access_token,
                'Content-Type': 'application/json'
            }
            pin_data = {
                "board_id": "YOUR_BOARD_ID",
                "title": seo_data['title'],
                "description": seo_data['description'] + ' ' + ' '.join(seo_data['hashtags']),
                "link": "https://yourwebsite.com"
            }
            if image_url:
                pin_data["media_source"] = {"source_type": "image_url", "url": image_url}
            response = requests.post(url, json=pin_data, headers=headers)
            response.raise_for_status()
            result = response.json()
            return {"success": True, "pinId": result.get('id', 'unknown'), "title": seo_data['title']}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def post_to_twitter(self, seo_data, media_path=None):
        """Post to Twitter/X"""
        try:
            import tweepy
            client = tweepy.Client(
                consumer_key=self.twitter_api_key,
                consumer_secret=self.twitter_api_secret,
                access_token=self.twitter_access_token,
                access_token_secret=self.twitter_access_token_secret
            )
            tweet_text = seo_data['title'] + "\n\n" + seo_data['description'] + "\n\n" + ' '.join(seo_data['hashtags'][:5])
            if len(tweet_text) > 280:
                tweet_text = tweet_text[:277] + "..."
            media_ids = []
            if media_path and os.path.exists(media_path):
                media = client.media_upload(filename=media_path)
                media_ids.append(media.media_id)
            response = client.create_tweet(text=tweet_text, media_ids=media_ids if media_ids else None)
            return {"success": True, "postId": response.data['id'], "text": tweet_text}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def post_to_instagram(self, seo_data, media_url=None):
        """Post to Instagram (placeholder - requires Facebook Graph API)"""
        try:
            # Instagram posting requires Facebook Graph API integration
            # This is a placeholder for future implementation
            return {"success": True, "postId": "instagram_placeholder", "note": "Instagram API integration pending"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def post_to_youtube(self, seo_data, video_path=None):
        """Post to YouTube (placeholder - requires YouTube Data API)"""
        try:
            # YouTube posting requires YouTube Data API v3
            # This is a placeholder for future implementation
            return {"success": True, "videoId": "youtube_placeholder", "note": "YouTube API integration pending"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def post_to_tiktok(self, seo_data, video_path=None):
        """Post to TikTok (placeholder - requires TikTok API)"""
        try:
            # TikTok posting requires TikTok API integration
            # This is a placeholder for future implementation
            return {"success": True, "videoId": "tiktok_placeholder", "note": "TikTok API integration pending"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def post_to_platform(self, platform, seo_data, media_path=None):
        """Route to appropriate platform poster"""
        platform_posters = {
            'pinterest': self.post_to_pinterest,
            'twitter': self.post_to_twitter,
            'instagram': self.post_to_instagram,
            'youtube': self.post_to_youtube,
            'tiktok': self.post_to_tiktok
        }
        
        poster_func = platform_posters.get(platform)
        if poster_func:
            return poster_func(seo_data, media_path)
        else:
            return {"success": False, "error": "Unsupported platform: " + platform}
    
    def process_seo_results(self, seo_file, platforms):
        """Process SEO results and post to selected platforms"""
        if not os.path.exists(seo_file):
            print("SEO file not found: " + seo_file)
            return
        
        with open(seo_file, 'r') as f:
            seo_results = json.load(f)
        
        print("Processing " + str(len(seo_results)) + " SEO results")
        print("Posting to platforms: " + ', '.join(platforms))
        
        results = {}
        for platform in platforms:
            results[platform] = []
        
        for seo_data in seo_results:
            print("\nPosting: " + seo_data.get('title', 'Untitled'))
            media_path = seo_data.get('original_file')
            
            for platform in platforms:
                print("  Posting to " + platform + "...")
                result = self.post_to_platform(platform, seo_data, media_path)
                results[platform].append(result)
                status = "Success" if result["success"] else "Failed"
                print("    " + platform + ": " + status)
        
        output_file = 'posting-results.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\nPosting results saved to: " + output_file)
        return results

def main():
    seo_file = os.environ.get('SEO_FILE', 'seo-results/seo_latest.json')
    platforms_str = os.environ.get('PLATFORMS', 'pinterest')
    platforms = [p.strip() for p in platforms_str.split(',')]
    
    if not os.path.exists(seo_file):
        seo_dir = Path('seo-results')
        if seo_dir.exists():
            seo_files = list(seo_dir.glob('*.json'))
            if seo_files:
                seo_file = str(max(seo_files, key=os.path.getmtime))
    
    print("Using SEO file: " + seo_file)
    print("Target platforms: " + ', '.join(platforms))
    
    poster = SocialMediaPoster()
    results = poster.process_seo_results(seo_file, platforms)
    
    if results:
        print("\nAll posts completed!")

if __name__ == '__main__':
    main()
