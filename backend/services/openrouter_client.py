import requests
import json
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
import time

class OpenRouterClient:
    """
    OpenRouter API client for accessing Gemini Flash 2.5 Lite and other models.
    """
    
    def __init__(self, api_key: str, site_url: str = "https://thebankstatementparser.com", site_name: str = "The Bank Statement Parser"):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": site_url,
            "X-Title": site_name,
        }
        self.model = "google/gemini-2.5-flash-lite"  # Default model
        
    def create_message_payload(self, prompt: str, temperature: float = 0.0) -> Dict[str, Any]:
        """Create the message payload for OpenRouter API."""
        return {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"}  # Force JSON response
        }
    
    def generate_content_sync(self, prompt: str, temperature: float = 0.0) -> str:
        """Synchronous content generation using OpenRouter."""
        try:
            payload = self.create_message_payload(prompt, temperature)
            
            response = requests.post(
                url=self.base_url,
                headers=self.headers,
                data=json.dumps(payload),
                timeout=60  # 60 second timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                return content
            else:
                error_msg = f"OpenRouter API error: {response.status_code} - {response.text}"
                print(f"ERROR: {error_msg}")
                raise Exception(error_msg)
                
        except Exception as e:
            print(f"ERROR in generate_content_sync: {e}")
            raise e
    
    async def generate_content_async(self, prompt: str, temperature: float = 0.0) -> str:
        """Asynchronous content generation using OpenRouter."""
        try:
            payload = self.create_message_payload(prompt, temperature)
            
            timeout = aiohttp.ClientTimeout(total=60)  # 60 second timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    self.base_url,
                    headers=self.headers,
                    data=json.dumps(payload)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                        return content
                    else:
                        error_text = await response.text()
                        error_msg = f"OpenRouter API error: {response.status} - {error_text}"
                        print(f"ERROR: {error_msg}")
                        raise Exception(error_msg)
                        
        except Exception as e:
            print(f"ERROR in generate_content_async: {e}")
            raise e

    def set_model(self, model_name: str):
        """Change the model being used."""
        self.model = model_name
        print(f"Model changed to: {model_name}")

    def test_connection(self) -> bool:
        """Test the OpenRouter API connection."""
        try:
            test_prompt = "Reply with a simple JSON object containing just: {\"status\": \"ok\"}"
            response = self.generate_content_sync(test_prompt)
            
            # Try to parse the response as JSON
            test_json = json.loads(response)
            return test_json.get("status") == "ok"
            
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

# Wrapper class to maintain compatibility with existing Gemini interface
class OpenRouterResponse:
    """Wrapper to mimic Google's GenerativeAI response object."""
    
    def __init__(self, text: str):
        self.text = text

class OpenRouterModel:
    """Wrapper to mimic Google's GenerativeModel interface."""
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
    
    def generate_content(self, prompt: str) -> OpenRouterResponse:
        """Synchronous content generation (mimics Gemini interface)."""
        response_text = self.client.generate_content_sync(prompt)
        return OpenRouterResponse(response_text)
    
    async def generate_content_async(self, prompt: str) -> OpenRouterResponse:
        """Asynchronous content generation (mimics Gemini interface)."""
        response_text = await self.client.generate_content_async(prompt)
        return OpenRouterResponse(response_text)

def create_openrouter_model(api_key: str, model_name: str = "google/gemini-2.5-flash-lite") -> OpenRouterModel:
    """Factory function to create an OpenRouter model that mimics Gemini's interface."""
    client = OpenRouterClient(api_key)
    client.set_model(model_name)
    return OpenRouterModel(client)