import stripe
import os
from typing import Dict, Any, Optional
from config import settings

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key or os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    """Service for handling Stripe payments and subscriptions."""
    
    @staticmethod
    def create_payment_intent(amount: int, currency: str = "usd", metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Create a payment intent for one-time payments.
        
        Args:
            amount: Amount in cents (e.g., 2000 = $20.00)
            currency: Currency code (default: "usd")
            metadata: Additional data to attach to the payment
            
        Returns:
            Payment intent object
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                automatic_payment_methods={
                    'enabled': True,
                },
                metadata=metadata or {}
            )
            return {
                "client_secret": intent.client_secret,
                "id": intent.id,
                "amount": intent.amount,
                "currency": intent.currency,
                "status": intent.status
            }
        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_checkout_session(
        price_data: Dict[str, Any],
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for hosted payment page.
        
        Args:
            price_data: Product and pricing information
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled
            customer_email: Customer's email address
            metadata: Additional data to attach to the session
            
        Returns:
            Checkout session object
        """
        try:
            session_data = {
                'payment_method_types': ['card'],
                'line_items': [{
                    'price_data': price_data,
                    'quantity': 1,
                }],
                'mode': 'payment',
                'success_url': success_url,
                'cancel_url': cancel_url,
            }
            
            if customer_email:
                session_data['customer_email'] = customer_email
                
            if metadata:
                session_data['metadata'] = metadata
            
            session = stripe.checkout.Session.create(**session_data)
            
            return {
                "checkout_url": session.url,
                "session_id": session.id,
                "payment_status": session.payment_status
            }
        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")
    
    @staticmethod
    def retrieve_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve payment intent details."""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                "id": intent.id,
                "amount": intent.amount,
                "currency": intent.currency,
                "status": intent.status,
                "metadata": intent.metadata
            }
        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")
    
    @staticmethod
    def retrieve_checkout_session(session_id: str) -> Dict[str, Any]:
        """Retrieve checkout session details."""
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return {
                "id": session.id,
                "payment_status": session.payment_status,
                "amount_total": session.amount_total,
                "currency": session.currency,
                "customer_email": session.customer_email,
                "metadata": session.metadata
            }
        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {str(e)}")
    
    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """Construct and verify webhook event."""
        webhook_secret = settings.stripe_webhook_secret or os.getenv("STRIPE_WEBHOOK_SECRET")
        if not webhook_secret:
            raise ValueError("Stripe webhook secret not configured")
            
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except ValueError as e:
            raise ValueError(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid signature: {str(e)}")

# Credit packages configuration
CREDIT_PACKAGES = {
    "starter": {
        "credits": 100,
        "price_cents": 999,  # $9.99
        "price_display": "$9.99",
        "description": "Perfect for small projects"
    },
    "professional": {
        "credits": 500,
        "price_cents": 3999,  # $39.99
        "price_display": "$39.99", 
        "description": "Great for regular use"
    },
    "enterprise": {
        "credits": 1500,
        "price_cents": 9999,  # $99.99
        "price_display": "$99.99",
        "description": "Best value for heavy usage"
    }
}

def get_package_by_id(package_id: str) -> Optional[Dict[str, Any]]:
    """Get credit package details by ID."""
    return CREDIT_PACKAGES.get(package_id)