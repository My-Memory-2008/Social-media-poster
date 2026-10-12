#!/usr/bin/env python3
import os
import sys
import json
import base64
import requests
from pathlib import Path

class QwenSEOGenerator:
    def __init__(self):
        self.api_key = os.environ.get('QWEN_API_KEY')
        if not self.api_key:
            raise ValueError("QWEN_API_KEY environment variable is not set")
        self.api_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    
    def encode_image(self, image_path):
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def analyze_content(self, file_path, content_type):
        prompt = """Analyze this """ + content_type + """ content and generate SEO-optimized metadata for social media platforms.

Consider these psychological motivators for maximum engagement:
- Ego: How does this make viewers feel about themselves?
- Emotion: What emotions does this evoke?
- Status: Does this convey status or aspiration?
- Wealth: Is there a wealth/money angle?
- Health: Any health/wellness connection?
- Justice: Does it trigger fairness/justice feelings?
- Anger: Could it provoke righteous anger?
- Perception: How will different audiences perceive this?

Generate:
1. A catchy, viral-worthy title (max 100 characters)
2. An engaging description (max 280 characters for Twitter)
3. 10-15 relevant hashtags optimized for each platform

Format the response as JSON with keys: title, description, hashtags"""
        
        headers = {
            'Authorization': 'Bearer ' + self.api_key,
            'Content-Type': 'application/json'
        }
        
        # For images, use vision model
        if content_type in ['image', 'mixed'] and file_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            try:
                image_base64 = self.encode_image(file_path)
                payload = {
                    "model": "qwen-vl-max",
                    "input": {
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"image": "data:image/jpeg;base64," + image_base64},
                                    {"text": prompt}
                                ]
                            }
                        ]
                    },
                    "parameters": {"result_format": "message"}
                }
            except Exception as e:
                print("Error encoding image: " + str(e))
                payload = {"model": "qwen-turbo", "input": {"messages": [{"role": "user", "content": prompt}]}}
        else:
            # For videos or text-only
            payload = {
                "model": "qwen-turbo",
                "input": {
                    "messages": [
                        {"role": "user", "content": prompt + "\n\nContent type: " + content_type + "\nFilename: " + os.path.basename(file_path)}
                    ]
                }
            }
        
        try:
            print("Calling Qwen API for: " + os.path.basename(file_path))
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            result = response.json()
            
            if 'output' in result and 'choices' in result['output']:
                generated_text = result['output']['choices'][0]['message']['content']
                
                # Try to parse as JSON
                try:
                    seo_data = json.loads(generated_text)
                except json.JSONDecodeError:
                    # Extract JSON from text if wrapped in other text
                    import re
                    json_match = re.search(r'\{[^}]+\}', generated_text)
                    if json_match:
                        try:
                            seo_data = json.loads(json_match.group())
                        except:
                            seo_data = {
                                "title": generated_text[:100],
                                "description": generated_text[:280],
                                "hashtags": ["#viral", "#trending", "#" + content_type]
                            }
                    else:
                        seo_data = {
                            "title": generated_text[:100],
                            "description": generated_text[:280],
                            "hashtags": ["#viral", "#trending", "#" + content_type]
                        }
                
                return seo_data
            else:
                raise Exception("Unexpected API response: " + str(result))
                
        except requests.exceptions.RequestException as e:
            print("API request failed: " + str(e))
            return {
                "title": "Amazing " + content_type + " Content",
                "description": "Check out this incredible " + content_type + "! #viral #trending",
                "hashtags": ["#viral", "#trending", "#" + content_type, "#socialmedia"]
            }
    
    def process_directory(self, directory, content_type):
        """Process all files in a directory"""
        results = []
        dir_path = Path(directory)
        
        if not dir_path.exists():
            print("Directory not found: " + directory)
            return results
        
        files = [f for f in dir_path.iterdir() if f.is_file()]
        print("Found " + str(len(files)) + " files to process")
        
        for file_path in files:
            print("\nProcessing: " + str(file_path))
            try:
                seo_data = self.analyze_content(str(file_path), content_type)
                seo_data['original_file'] = str(file_path)
                seo_data['filename'] = file_path.name
                results.append(seo_data)
                print("✓ Successfully generated SEO for: " + file_path.name)
            except Exception as e:
                print("✗ Error processing " + file_path.name + ": " + str(e))
        
        return results
    
    def save_results(self, results, output_dir='seo-results'):
        """Save SEO results to JSON file"""
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, 'seo_latest.json')
        
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\nSEO results saved to: " + output_file)
        return output_file


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate-seo.py <directory> <content_type>")
        print("Example: python generate-seo.py temp_files/ image")
        sys.exit(1)
    
    directory = sys.argv[1]
    content_type = sys.argv[2]
    
    print("=" * 60)
    print("Qwen 2.5 SEO Generator")
    print("=" * 60)
    print("Directory: " + directory)
    print("Content Type: " + content_type)
    print("=" * 60)
    
    # Initialize generator
    generator = QwenSEOGenerator()
    
    # Process files
    results = generator.process_directory(directory, content_type)
    
    # Save results
    if results:
        output_file = generator.save_results(results)
        print("\n✅ Successfully generated SEO for " + str(len(results)) + " files")
    else:
        print("\n❌ No results generated")
        sys.exit(1)


if __name__ == '__main__':
    main()
