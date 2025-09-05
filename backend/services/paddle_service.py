import httpx
import json
import hmac
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime
from config import settings
import os

class PaddleService:
    """Service for handling Paddle Billing API v4 payments."""
    
    def __init__(self):
        self.api_key = settings.paddle_api_key or os.getenv("PADDLE_API_KEY")
        self.webhook_secret = settings.paddle_webhook_secret or os.getenv("PADDLE_WEBHOOK_SECRET")
        self.environment = settings.paddle_environment or os.getenv("PADDLE_ENVIRONMENT", "sandbox")
        
        if self.environment == "sandbox":
            self.base_url = "https://sandbox-api.paddle.com"
        else:
            self.base_url = "https://api.paddle.com"
            
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def create_product(self, name: str, description: str) -> Dict[str, Any]:
        """Create a product in Paddle."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/products",
                    headers=self.headers,
                    json={
                        "name": name,
                        "description": description,
                        "type": "standard"
                    }
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to create product: {str(e)}")

    async def create_price(self, product_id: str, amount: str, currency: str = "USD") -> Dict[str, Any]:
        """Create a price for a product."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/prices",
                    headers=self.headers,
                    json={
                        "product_id": product_id,
                        "unit_price": {
                            "amount": amount,
                            "currency_code": currency
                        },
                        "billing_cycle": None,  # One-time payment
                        "name": f"Credits Package - {currency} {amount}"
                    }
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to create price: {str(e)}")

    async def create_transaction(
        self,
        items: List[Dict[str, Any]],
        customer_email: str,
        success_url: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a transaction for checkout."""
        try:
            transaction_data = {
                "items": items,
                "customer": {
                    "email": customer_email
                },
                "checkout": {
                    "url": success_url
                },
                "custom_data": metadata or {}
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/transactions",
                    headers=self.headers,
                    json=transaction_data
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to create transaction: {str(e)}")

    async def get_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """Get transaction details."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/transactions/{transaction_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to get transaction: {str(e)}")

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Paddle webhook signature."""
        if not self.webhook_secret:
            raise Exception("Paddle webhook secret not configured")
            
        try:
            # Paddle uses HMAC-SHA256
            expected_signature = hmac.new(
                self.webhook_secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures securely
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            raise Exception(f"Failed to verify webhook signature: {str(e)}")

    async def list_products(self) -> Dict[str, Any]:
        """List all products."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/products",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to list products: {str(e)}")

    async def list_prices(self, product_id: str = None) -> Dict[str, Any]:
        """List prices, optionally filtered by product."""
        try:
            url = f"{self.base_url}/prices"
            if product_id:
                url += f"?product_id={product_id}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    raise Exception(f"Paddle API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Failed to list prices: {str(e)}")

# Credit packages configuration for Paddle
PADDLE_CREDIT_PACKAGES = {
    "starter": {
        "credits": 100,
        "price_amount": "999",  # $9.99 in cents for Paddle
        "price_display": "$9.99",
        "description": "Perfect for small projects",
        "currency": "USD"
    },
    "professional": {
        "credits": 500,
        "price_amount": "3999",  # $39.99 in cents
        "price_display": "$39.99", 
        "description": "Great for regular use",
        "currency": "USD"
    },
    "enterprise": {
        "credits": 1500,
        "price_amount": "9999",  # $99.99 in cents
        "price_display": "$99.99",
        "description": "Best value for heavy usage",
        "currency": "USD"
    }
}

def get_paddle_package_by_id(package_id: str) -> Optional[Dict[str, Any]]:
    """Get credit package details by ID."""
    return PADDLE_CREDIT_PACKAGES.get(package_id)

# Singleton instance
paddle_service = PaddleService()