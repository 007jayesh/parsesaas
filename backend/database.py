import httpx
import json
from config import settings

class Database:
    def __init__(self):
        self.base_url = f"{settings.supabase_url}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def get_user_by_email(self, email: str):
        """Get user by email"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users?email=eq.{email}&select=*",
                headers=self.headers
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data[0] if data and len(data) > 0 else None
    
    async def get_user_by_google_id(self, google_id: str):
        """Get user by Google ID"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users?google_id=eq.{google_id}&select=*",
                headers=self.headers
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data[0] if data and len(data) > 0 else None
    
    async def create_user(self, user_data: dict):
        """Create new user"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/users?select=*",
                headers=self.headers,
                json=user_data
            )
            print(f"Create user response: {response.status_code} - {response.text}")
            
            if response.status_code != 201:
                return None
            
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception as e:
                print(f"JSON parse error: {e}")
                return None
    
    async def update_user_credits(self, user_id: str, credits: int):
        """Update user credits"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/users?id=eq.{user_id}&select=*",
                headers=self.headers,
                json={"credits": credits}
            )
            if response.status_code != 200:
                return None
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception:
                return None
    
    async def create_conversion(self, conversion_data: dict):
        """Create conversion record"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/conversions?select=*",
                headers=self.headers,
                json=conversion_data
            )
            print(f"Create conversion response: {response.status_code} - {response.text}")
            
            if response.status_code != 201:
                return None
            
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception as e:
                print(f"JSON parse error: {e}")
                return None
    
    async def update_conversion(self, conversion_id: str, update_data: dict):
        """Update conversion record"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/conversions?id=eq.{conversion_id}&select=*",
                headers=self.headers,
                json=update_data
            )
            data = response.json()
            return data[0] if data else None
    
    async def get_user_conversions(self, user_id: str, limit: int = 10):
        """Get user's conversion history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/conversions?user_id=eq.{user_id}&order=created_at.desc&limit={limit}&select=*",
                headers=self.headers
            )
            return response.json()
    
    async def create_credit_transaction(self, transaction_data: dict):
        """Create credit transaction record"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/credit_transactions?select=*",
                headers=self.headers,
                json=transaction_data
            )
            if response.status_code != 201:
                return None
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception:
                return None
    
    async def get_user_by_id(self, user_id: str):
        """Get user by ID"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users?id=eq.{user_id}&select=*",
                headers=self.headers
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data[0] if data and len(data) > 0 else None
    
    async def update_user_password(self, user_id: str, password_hash: str):
        """Update user password"""
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/users?id=eq.{user_id}",
                headers=self.headers,
                json={"password_hash": password_hash}
            )
            return response.status_code == 200
    
    async def create_password_reset_token(self, token_data: dict):
        """Create password reset token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/password_reset_tokens?select=*",
                headers=self.headers,
                json=token_data
            )
            if response.status_code != 201:
                return None
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception:
                return None
    
    async def get_password_reset_token(self, token_hash: str):
        """Get password reset token by hash"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/password_reset_tokens?token_hash=eq.{token_hash}&select=*",
                headers=self.headers
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data[0] if data and len(data) > 0 else None
    
    async def delete_password_reset_token(self, token_hash: str):
        """Delete password reset token"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/password_reset_tokens?token_hash=eq.{token_hash}",
                headers=self.headers
            )
            return response.status_code == 204
    
    # Payment-related methods
    async def create_payment_record(self, payment_data: dict):
        """Create payment record"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments?select=*",
                headers=self.headers,
                json=payment_data
            )
            if response.status_code != 201:
                return None
            try:
                if response.text:
                    data = response.json()
                    return data[0] if data and len(data) > 0 else None
                else:
                    return None
            except Exception:
                return None
    
    async def get_payment_by_id(self, payment_id: str):
        """Get payment record by ID"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/payments?id=eq.{payment_id}&select=*",
                headers=self.headers
            )
            if response.status_code != 200:
                return None
            data = response.json()
            return data[0] if data and len(data) > 0 else None
    
    async def update_payment_status(self, payment_id: str, status: str, completed_at: str = None):
        """Update payment status"""
        update_data = {"status": status}
        if completed_at:
            update_data["completed_at"] = completed_at
            
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/payments?id=eq.{payment_id}",
                headers=self.headers,
                json=update_data
            )
            return response.status_code == 200
    
    async def get_user_payments(self, user_id: str, limit: int = 50):
        """Get user's payment history"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/payments?user_id=eq.{user_id}&order=created_at.desc&limit={limit}&select=*",
                headers=self.headers
            )
            return response.json()

db = Database()