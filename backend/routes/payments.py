from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import stripe
from datetime import datetime

from models.user import UserResponse
from services.auth import get_current_user
from services.stripe_service import StripeService, CREDIT_PACKAGES, get_package_by_id
from database import db

router = APIRouter(prefix="/payments", tags=["payments"])

class CreatePaymentIntentRequest(BaseModel):
    package_id: str

class CreateCheckoutSessionRequest(BaseModel):
    package_id: str
    success_url: str
    cancel_url: str

class PaymentIntentResponse(BaseModel):
    client_secret: str
    amount: int
    currency: str

class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str

@router.get("/packages")
async def get_credit_packages():
    """Get available credit packages."""
    return {"packages": CREDIT_PACKAGES}

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a Stripe payment intent for credit purchase."""
    
    # Get package details
    package = get_package_by_id(request.package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package ID"
        )
    
    try:
        # Create payment intent
        payment_intent = StripeService.create_payment_intent(
            amount=package["price_cents"],
            currency="usd",
            metadata={
                "user_id": current_user.id,
                "package_id": request.package_id,
                "credits": str(package["credits"]),
                "user_email": current_user.email
            }
        )
        
        # Store payment intent in database for tracking
        await db.create_payment_record({
            "id": payment_intent["id"],
            "user_id": current_user.id,
            "package_id": request.package_id,
            "amount_cents": package["price_cents"],
            "credits": package["credits"],
            "currency": "usd",
            "provider": "stripe",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        })
        
        return PaymentIntentResponse(
            client_secret=payment_intent["client_secret"],
            amount=payment_intent["amount"],
            currency=payment_intent["currency"]
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment intent: {str(e)}"
        )

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a Stripe Checkout session for credit purchase."""
    
    # Get package details
    package = get_package_by_id(request.package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package ID"
        )
    
    try:
        # Prepare price data
        price_data = {
            "currency": "usd",
            "product_data": {
                "name": f"{package['credits']} Credits",
                "description": f"{package['description']} - {package['credits']} processing credits"
            },
            "unit_amount": package["price_cents"]
        }
        
        # Create checkout session
        session = StripeService.create_checkout_session(
            price_data=price_data,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            customer_email=current_user.email,
            metadata={
                "user_id": current_user.id,
                "package_id": request.package_id,
                "credits": str(package["credits"])
            }
        )
        
        # Store checkout session in database for tracking
        await db.create_payment_record({
            "id": session["session_id"],
            "user_id": current_user.id,
            "package_id": request.package_id,
            "amount_cents": package["price_cents"],
            "credits": package["credits"],
            "currency": "usd",
            "provider": "stripe",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        })
        
        return CheckoutSessionResponse(
            checkout_url=session["checkout_url"],
            session_id=session["session_id"]
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment confirmation."""
    
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Construct and verify webhook event
        event = StripeService.construct_webhook_event(payload, sig_header)
        
        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            await handle_payment_success(payment_intent['id'], 'payment_intent')
            
        elif event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await handle_payment_success(session['id'], 'checkout_session')
            
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            await handle_payment_failure(payment_intent['id'], 'payment_intent')
            
        return JSONResponse(content={"status": "success"})
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

async def handle_payment_success(payment_id: str, payment_type: str):
    """Handle successful payment and update user credits."""
    try:
        # Get payment record from database
        payment_record = await db.get_payment_by_id(payment_id)
        if not payment_record:
            print(f"Payment record not found: {payment_id}")
            return
            
        # Skip if already processed
        if payment_record.get("status") == "completed":
            print(f"Payment already processed: {payment_id}")
            return
            
        # Update user credits
        user_id = payment_record["user_id"]
        credits_to_add = payment_record["credits"]
        
        # Get current user credits
        user = await db.get_user_by_id(user_id)
        if not user:
            print(f"User not found: {user_id}")
            return
            
        new_credits = user["credits"] + credits_to_add
        await db.update_user_credits(user_id, new_credits)
        
        # Create credit transaction record
        await db.create_credit_transaction({
            "user_id": user_id,
            "amount": credits_to_add,
            "transaction_type": "purchase",
            "description": f"Credit purchase - {payment_record['package_id']} package",
            "payment_id": payment_id
        })
        
        # Update payment record status
        await db.update_payment_status(payment_id, "completed", datetime.utcnow().isoformat())
        
        print(f"Payment processed successfully: {payment_id}, User: {user_id}, Credits added: {credits_to_add}")
        
    except Exception as e:
        print(f"Error processing payment success: {str(e)}")
        # Update payment record with error
        await db.update_payment_status(payment_id, "error", datetime.utcnow().isoformat())

async def handle_payment_failure(payment_id: str, payment_type: str):
    """Handle failed payment."""
    try:
        # Update payment record status
        await db.update_payment_status(payment_id, "failed", datetime.utcnow().isoformat())
        print(f"Payment failed: {payment_id}")
        
    except Exception as e:
        print(f"Error processing payment failure: {str(e)}")

@router.get("/history")
async def get_payment_history(current_user: UserResponse = Depends(get_current_user)):
    """Get user's payment history."""
    try:
        payments = await db.get_user_payments(current_user.id, limit=50)
        return {"payments": payments}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment history: {str(e)}"
        )