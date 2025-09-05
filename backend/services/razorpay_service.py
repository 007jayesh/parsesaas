import razorpay
import hmac
import hashlib
import os
from typing import Dict, Any, Optional
from config import settings

class RazorpayService:
    """Service for handling Razorpay payments."""
    
    def __init__(self):
        key_id = settings.razorpay_key_id or os.getenv("RAZORPAY_KEY_ID")
        key_secret = settings.razorpay_key_secret or os.getenv("RAZORPAY_KEY_SECRET")
        
        if not key_id or not key_secret:
            raise ValueError("Razorpay credentials not configured")
            
        self.client = razorpay.Client(auth=(key_id, key_secret))
        self.webhook_secret = settings.razorpay_webhook_secret or os.getenv("RAZORPAY_WEBHOOK_SECRET")

    def create_order(self, amount_paise: int, currency: str = "INR", receipt: str = None, notes: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a Razorpay order.
        
        Args:
            amount_paise: Amount in paise (1 INR = 100 paise)
            currency: Currency code (default: "INR")
            receipt: Receipt number for reference
            notes: Additional data
            
        Returns:
            Order object
        """
        try:
            order_data = {
                "amount": amount_paise,
                "currency": currency,
                "payment_capture": 1  # Auto capture
            }
            
            if receipt:
                order_data["receipt"] = receipt
                
            if notes:
                order_data["notes"] = notes
            
            order = self.client.order.create(order_data)
            return order
            
        except Exception as e:
            raise ValueError(f"Razorpay order creation failed: {str(e)}")

    def verify_payment_signature(self, payment_id: str, order_id: str, signature: str) -> bool:
        """Verify payment signature for security."""
        try:
            # Create verification signature
            body = f"{order_id}|{payment_id}"
            expected_signature = hmac.new(
                key=self.client.auth[1].encode(),  # key_secret
                msg=body.encode(),
                digestmod=hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            print(f"Signature verification failed: {str(e)}")
            return False

    def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """Get payment details."""
        try:
            return self.client.payment.fetch(payment_id)
        except Exception as e:
            raise ValueError(f"Failed to fetch payment: {str(e)}")

    def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order details."""
        try:
            return self.client.order.fetch(order_id)
        except Exception as e:
            raise ValueError(f"Failed to fetch order: {str(e)}")

    def capture_payment(self, payment_id: str, amount_paise: int) -> Dict[str, Any]:
        """Capture a payment (if auto-capture is disabled)."""
        try:
            return self.client.payment.capture(payment_id, amount_paise)
        except Exception as e:
            raise ValueError(f"Failed to capture payment: {str(e)}")

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature."""
        if not self.webhook_secret:
            raise ValueError("Razorpay webhook secret not configured")
            
        try:
            # Razorpay uses HMAC-SHA256
            expected_signature = hmac.new(
                self.webhook_secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            raise ValueError(f"Failed to verify webhook signature: {str(e)}")

    def create_refund(self, payment_id: str, amount_paise: int = None, notes: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a refund for a payment."""
        try:
            refund_data = {}
            if amount_paise:
                refund_data["amount"] = amount_paise
            if notes:
                refund_data["notes"] = notes
                
            return self.client.payment.refund(payment_id, refund_data)
        except Exception as e:
            raise ValueError(f"Failed to create refund: {str(e)}")

# Credit packages configuration for Razorpay (in paise)
RAZORPAY_CREDIT_PACKAGES = {
    "starter": {
        "credits": 100,
        "amount_paise": 82500,  # ₹825 (approximately $9.99)
        "amount_display": "₹825",
        "description": "Perfect for small projects",
        "currency": "INR"
    },
    "professional": {
        "credits": 500,
        "amount_paise": 330000,  # ₹3,300 (approximately $39.99)
        "amount_display": "₹3,300", 
        "description": "Great for regular use",
        "currency": "INR"
    },
    "enterprise": {
        "credits": 1500,
        "amount_paise": 825000,  # ₹8,250 (approximately $99.99)
        "amount_display": "₹8,250",
        "description": "Best value for heavy usage",
        "currency": "INR"
    }
}

def get_razorpay_package_by_id(package_id: str) -> Optional[Dict[str, Any]]:
    """Get credit package details by ID."""
    return RAZORPAY_CREDIT_PACKAGES.get(package_id)

# Singleton instance
razorpay_service = RazorpayService()