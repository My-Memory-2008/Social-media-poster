#!/usr/bin/env python3
import os
import sys
import json
from pathlib import Path

class SocialMediaPoster:
    def __init__(self):
        # Twitter credentials
        self.twitter_api_key = os.environ.get('TWITTER_API_KEY')
        self.twitter_api_secret = os.environ.get('TWITTER_API_SECRET')
        self.twitter_access_token = os.environ.get('TWITTER_ACCESS_TOKEN')
        self.twitter_access_token_secret = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET')
        
        # Pinterest credentials (from GitHub Secrets)
        self.pinterest_access_token = os.environ.get('PINTEREST_ACCESS_TOKEN')
        self.pinterest_board_id = os.environ.get('PINTEREST_BOARD_ID')
        
        # Other platforms
        self.instagram_access_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.youtube_api_key = os.environ.get('YOUTUBE_API_KEY')
        self.tiktok_access_token = os.environ.get('TIKTOK_ACCESS_TOKEN')
        
        print("=" * 60)
        print("Social Media Poster - Credentials Check")
        print("=" * 60)
        print("Twitter: " + str(all([self.twitter_api_key, self.twitter_api_secret, self.twitter_access_token, self.twitter_access_token_secret])))
        print("Pinterest Access Token: " + str(bool(self.pinterest_access_token)))
        print("Pinterest Board ID: " + str(bool(self.pinterest_board_id)))
        print("Instagram: " + str(bool(self.instagram_access_token)))
        print("YouTube: " + str(bool(self.youtube_api_key)))
        print("TikTok: " + str(bool(self.tiktok_access_token)))
        print("=" * 60)
        
        # Validate critical credentials
        if not self.pinterest_access_token:
            print("⚠️  WARNING: PINTEREST_ACCESS_TOKEN not set!")
        if not self.pinterest_board_id:
            print("⚠️  WARNING: PINTEREST_BOARD_ID not set!")
    
    def post_to_pinterest(self, seo_data, image_url=None):
        """Post to Pinterest using credentials from GitHub Secrets"""
        if not self.pinterest_access_token:
            return {"success": False, "error": "Pinterest access token not configured"}
        
        if not self.pinterest_board_id:
            return {"success": False, "error": "Pinterest board ID not configured"}
        
        try:
            import requests
            
            url = "https://api.pinterest.com/v5/pins"
            
            headers = {
                'Authorization': 'Bearer ' + self.pinterest_access_token,
                'Content-Type': 'application/json'
            }
            
            # Prepare pin data
            pin_data = {
                "board_id": self.pinterest_board_id,
                "title": seo_data.get('title', ''),
                "description": seo_data.get('description', '') + ' ' + ' '.join(seo_data.get('hashtags', [])),
                "link": "https://yourwebsite.com",
                "dominant_color": "#667eea"
            }
            
            # Add media if provided
            if image_url:
                pin_data["media_source"] = {
                    "source_type": "image_url",
                    "url": image_url
                }
            
            print("Posting to Pinterest...")
            print("Board ID: " + self.pinterest_board_id)
            print("Title: " + seo_data.get('title', ''))
            
            response = requests.post(url, json=pin_data, headers=headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            print("✓ Pinterest post successful!")
            print("Pin ID: " + result.get('id', 'unknown'))
            
            return {
                "success": True,
                "pinId": result.get('id', 'unknown'),
                "title": seo_data.get('title', ''),
                "platform": "pinterest"
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = "HTTP Error: " + str(e)
            if e.response is not None:
                try:
                    error_detail = e.response.json()
                    error_msg += " - " + json.dumps(error_detail)
                except:
                    error_msg += " - " + e.response.text
            print("✗ Pinterest post failed: " + error_msg)
            return {"success": False, "error": error_msg, "platform": "pinterest"}
            
        except Exception as e:
            error_msg = "Error posting to Pinterest: " + str(e)
            print("✗ " + error_msg)
            return {"success": False, "error": error_msg, "platform": "pinterest"}
    
    def post_to_twitter(self, seo_data, media_path=None):
        """Post to Twitter/X"""
        if not all([self.twitter_api_key, self.twitter_api_secret, self.twitter_access_token, self.twitter_access_token_secret]):
            return {"success": False, "error": "Twitter credentials not fully configured", "platform": "twitter"}
        
        try:
            import tweepy
            
            client = tweepy.Client(
                consumer_key=self.twitter_api_key,
                consumer_secret=self.twitter_api_secret,
                access_token=self.twitter_access_token,
                access_token_secret=self.twitter_access_token_secret
            )
            
            tweet_text = seo_data.get('title', '') + "\n\n" + seo_data.get('description', '') + "\n\n" + ' '.join(seo_data.get('hashtags', [])[:5])
            
            # Twitter has 280 character limit
            if len(tweet_text) > 280:
                tweet_text = tweet_text[:277] + "..."
            
            # Upload media if provided
            media_ids = []
            if media_path and os.path.exists(media_path):
                print("Uploading media to Twitter...")
                media = client.media_upload(filename=media_path)
                media_ids.append(media.media_id)
            
            print("Posting to Twitter...")
            response = client.create_tweet(
                text=tweet_text,
                media_ids=media_ids if media_ids else None
            )
            
            print("✓ Twitter post successful!")
            print("Tweet ID: " + response.data['id'])
            
            return {
                "success": True,
                "postId": response.data['id'],
                "text": tweet_text,
                "platform": "twitter"
            }
            
        except Exception as e:
            error_msg = "Error posting to Twitter: " + str(e)
            print("✗ " + error_msg)
            return {"success": False, "error": error_msg, "platform": "twitter"}
    
    def post_to_instagram(self, seo_data, media_url=None):
        """Post to Instagram (placeholder)"""
        print("Instagram posting not yet implemented")
        return {
            "success": False,
            "error": "Instagram API integration pending",
            "platform": "instagram"
        }
    
    def post_to_youtube(self, seo_data, video_path=None):
        """Post to YouTube (placeholder)"""
        print("YouTube posting not yet implemented")
        return {
            "success": False,
            "error": "YouTube API integration pending",
            "platform": "youtube"
        }
    
    def post_to_tiktok(self, seo_data, video_path=None):
        """Post to TikTok (placeholder)"""
        print("TikTok posting not yet implemented")
        return {
            "success": False,
            "error": "TikTok API integration pending",
            "platform": "tiktok"
        }
    
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
            return {
                "success": False,
                "error": "Unsupported platform: " + platform,
                "platform": platform
            }
    
    def process_seo_results(self, seo_file, platforms):
        """Process SEO results and post to selected platforms"""
        if not os.path.exists(seo_file):
            print("SEO file not found: " + seo_file)
            return None
        
        print("\nLoading SEO results from: " + seo_file)
        with open(seo_file, 'r') as f:
            seo_results = json.load(f)
        
        print("Found " + str(len(seo_results)) + " SEO results")
        print("Target platforms: " + ', '.join(platforms))
        print("=" * 60)
        
        results = {}
        for platform in platforms:
            results[platform] = []
        
        for i, seo_data in enumerate(seo_results):
            print("\n" + "=" * 60)
            print("Processing content " + str(i+1) + "/" + str(len(seo_results)))
            print("Title: " + seo_data.get('title', 'Untitled'))
            print("=" * 60)
            
            media_path = seo_data.get('original_file')
            
            for platform in platforms:
                print("\n>> Posting to: " + platform.upper())
                result = self.post_to_platform(platform, seo_data, media_path)
                results[platform].append(result)
                
                if result["success"]:
                    print("✓ SUCCESS")
                else:
                    print("✗ FAILED: " + result.get("error", "Unknown error"))
        
        # Save results
        output_file = 'posting-results.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\n" + "=" * 60)
        print("Posting results saved to: " + output_file)
        print("=" * 60)
        
        return results


def main():
    # Get parameters from environment variables (set by GitHub Actions)
    seo_file = os.environ.get('SEO_FILE', 'seo-results/seo_latest.json')
    platforms_str = os.environ.get('PLATFORMS', 'pinterest')
    platforms = [p.strip() for p in platforms_str.split(',') if p.strip()]
    
    if not platforms:
        print("ERROR: No platforms specified!")
        sys.exit(1)
    
    print("=" * 60)
    print("Social Media Auto-Poster")
    print("=" * 60)
    print("SEO File: " + seo_file)
    print("Platforms: " + ', '.join(platforms))
    print("=" * 60)
    
    # Initialize poster
    poster = SocialMediaPoster()
    
    # Process and post
    results = poster.process_seo_results(seo_file, platforms)
    
    if results:
        print("\n🎉 All posting operations completed!")
        
        # Summary
        success_count = 0
        fail_count = 0
        for platform, posts in results.items():
            for post in posts:
                if post.get('success'):
                    success_count += 1
                else:
                    fail_count += 1
        
        print("\nSummary:")
        print("  Successful: " + str(success_count))
        print("  Failed: " + str(fail_count))
        
        if fail_count > 0:
            print("\n⚠️  Some posts failed. Check logs above for details.")
            sys.exit(1)
    else:
        print("\n⚠️  No posts were made")
        sys.exit(1)


if __name__ == '__main__':
    main()
