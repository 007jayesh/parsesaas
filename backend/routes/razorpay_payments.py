from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import json

from models.user import UserResponse
from services.auth import get_current_user
from services.razorpay_service import razorpay_service, RAZORPAY_CREDIT_PACKAGES, get_razorpay_package_by_id
from database import db

router = APIRouter(prefix="/razorpay", tags=["razorpay-payments"])

class CreateRazorpayOrderRequest(BaseModel):
    package_id: str

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    package_id: str

class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str

@router.get("/packages")
async def get_razorpay_credit_packages():
    """Get available credit packages for Razorpay."""
    return {"packages": RAZORPAY_CREDIT_PACKAGES}

@router.post("/create-order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    request: CreateRazorpayOrderRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a Razorpay order for credit purchase."""
    
    # Get package details
    package = get_razorpay_package_by_id(request.package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package ID"
        )
    
    try:
        # Create order with Razorpay
        order = razorpay_service.create_order(
            amount_paise=package["amount_paise"],
            currency=package["currency"],
            receipt=f"order_{current_user.id}_{request.package_id}_{int(datetime.utcnow().timestamp())}",
            notes={
                "user_id": current_user.id,
                "package_id": request.package_id,
                "credits": str(package["credits"]),
                "user_email": current_user.email
            }
        )
        
        order_id = order["id"]
        
        # Store order in database for tracking
        await db.create_payment_record({
            "id": order_id,
            "user_id": current_user.id,
            "package_id": request.package_id,
            "amount_cents": package["amount_paise"],  # Store in paise for Razorpay
            "credits": package["credits"],
            "currency": package["currency"],
            "provider": "razorpay",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        })
        
        return RazorpayOrderResponse(
            order_id=order_id,
            amount=order["amount"],
            currency=order["currency"],
            key_id=razorpay_service.client.auth[0]  # Public key ID
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay order: {str(e)}"
        )

@router.post("/verify-payment")
async def verify_razorpay_payment(
    request: VerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Verify Razorpay payment after successful payment."""
    
    try:
        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            request.payment_id,
            request.order_id,
            request.signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Get payment record from database
        payment_record = await db.get_payment_by_id(request.order_id)
        if not payment_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found"
            )
        
        # Verify user owns this payment
        if payment_record["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Payment does not belong to user"
            )
        
        # Skip if already processed
        if payment_record.get("status") == "completed":
            return {"message": "Payment already processed", "status": "completed"}
        
        # Process payment success
        await process_razorpay_payment_success(
            request.order_id,
            request.payment_id,
            payment_record
        )
        
        return {
            "message": "Payment verified successfully",
            "status": "completed",
            "credits_added": payment_record["credits"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )

async def process_razorpay_payment_success(order_id: str, payment_id: str, payment_record: Dict[str, Any]):
    """Process successful Razorpay payment and update user credits."""
    try:
        # Update user credits
        user_id = payment_record["user_id"]
        credits_to_add = payment_record["credits"]
        
        # Get current user credits
        user = await db.get_user_by_id(user_id)
        if not user:
            raise Exception(f"User not found: {user_id}")
            
        new_credits = user["credits"] + credits_to_add
        await db.update_user_credits(user_id, new_credits)
        
        # Create credit transaction record
        await db.create_credit_transaction({
            "user_id": user_id,
            "amount": credits_to_add,
            "transaction_type": "purchase",
            "description": f"Credit purchase - {payment_record['package_id']} package",
            "payment_id": order_id
        })
        
        # Update payment record status
        await db.update_payment_status(order_id, "completed", datetime.utcnow().isoformat())
        
        print(f"Razorpay payment processed successfully: {order_id}, User: {user_id}, Credits added: {credits_to_add}")
        
    except Exception as e:
        print(f"Error processing Razorpay payment success: {str(e)}")
        # Update payment record with error
        await db.update_payment_status(order_id, "error", datetime.utcnow().isoformat())
        raise e

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks for payment confirmation."""
    
    try:
        payload = await request.body()
        signature = request.headers.get('x-razorpay-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Razorpay signature"
            )
        
        # Verify webhook signature
        is_valid = razorpay_service.verify_webhook_signature(payload, signature)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature"
            )
        
        # Parse webhook data
        webhook_data = json.loads(payload.decode())
        event = webhook_data.get("event")
        
        # Handle different event types
        if event == "payment.captured":
            payment_data = webhook_data.get("payload", {}).get("payment", {}).get("entity", {})
            await handle_razorpay_payment_captured(payment_data)
            
        elif event == "payment.failed":
            payment_data = webhook_data.get("payload", {}).get("payment", {}).get("entity", {})
            await handle_razorpay_payment_failed(payment_data)
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        print(f"Razorpay webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

async def handle_razorpay_payment_captured(payment_data: Dict[str, Any]):
    """Handle captured payment from webhook."""
    try:
        order_id = payment_data.get("order_id")
        payment_id = payment_data.get("id")
        
        if not order_id:
            print("No order_id in payment data")
            return
            
        # Get payment record from database
        payment_record = await db.get_payment_by_id(order_id)
        if not payment_record:
            print(f"Payment record not found: {order_id}")
            return
            
        # Skip if already processed
        if payment_record.get("status") == "completed":
            print(f"Payment already processed: {order_id}")
            return
            
        # Process payment success
        await process_razorpay_payment_success(order_id, payment_id, payment_record)
        
    except Exception as e:
        print(f"Error handling Razorpay payment captured: {str(e)}")

async def handle_razorpay_payment_failed(payment_data: Dict[str, Any]):
    """Handle failed payment from webhook."""
    try:
        order_id = payment_data.get("order_id")
        
        if order_id:
            # Update payment record status
            await db.update_payment_status(order_id, "failed", datetime.utcnow().isoformat())
            print(f"Razorpay payment failed: {order_id}")
        
    except Exception as e:
        print(f"Error handling Razorpay payment failure: {str(e)}")

@router.get("/payment/{payment_id}")
async def get_razorpay_payment(
    payment_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get Razorpay payment details."""
    try:
        # Get payment from Razorpay
        payment_data = razorpay_service.get_payment(payment_id)
        
        # Get local payment record
        order_id = payment_data.get("order_id")
        if order_id:
            payment_record = await db.get_payment_by_id(order_id)
            if payment_record and payment_record["user_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Payment does not belong to user"
                )
        
        return {
            "payment": payment_data,
            "local_record": payment_record if 'payment_record' in locals() else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment: {str(e)}"
        )