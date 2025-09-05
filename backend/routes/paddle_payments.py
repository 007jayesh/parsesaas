from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

from models.user import UserResponse
from services.auth import get_current_user
from services.paddle_service import paddle_service, PADDLE_CREDIT_PACKAGES, get_paddle_package_by_id
from database import db

router = APIRouter(prefix="/paddle", tags=["paddle-payments"])

class CreatePaddleTransactionRequest(BaseModel):
    package_id: str
    success_url: str

class PaddleTransactionResponse(BaseModel):
    checkout_url: str
    transaction_id: str

@router.get("/packages")
async def get_paddle_credit_packages():
    """Get available credit packages for Paddle."""
    return {"packages": PADDLE_CREDIT_PACKAGES}

@router.post("/create-transaction", response_model=PaddleTransactionResponse)
async def create_paddle_transaction(
    request: CreatePaddleTransactionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a Paddle transaction for credit purchase."""
    
    # Get package details
    package = get_paddle_package_by_id(request.package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package ID"
        )
    
    try:
        # First, we need to create/get products and prices in Paddle
        # For now, we'll use pre-configured price IDs from Paddle Dashboard
        
        # In production, you'd create these in Paddle Dashboard and use the IDs
        price_ids = {
            "starter": "pri_01hv6y7eh8gp8wrqpexq8bn5x7",  # Replace with actual Paddle price IDs
            "professional": "pri_01hv6y7eh8gp8wrqpexq8bn5x8",
            "enterprise": "pri_01hv6y7eh8gp8wrqpexq8bn5x9"
        }
        
        price_id = price_ids.get(request.package_id)
        if not price_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price ID not configured for this package"
            )
        
        # Create transaction
        transaction_data = await paddle_service.create_transaction(
            items=[{
                "price_id": price_id,
                "quantity": 1
            }],
            customer_email=current_user.email,
            success_url=request.success_url,
            metadata={
                "user_id": current_user.id,
                "package_id": request.package_id,
                "credits": str(package["credits"]),
                "user_email": current_user.email
            }
        )
        
        transaction_id = transaction_data["data"]["id"]
        checkout_url = transaction_data["data"]["checkout"]["url"]
        
        # Store transaction in database for tracking
        await db.create_payment_record({
            "id": transaction_id,
            "user_id": current_user.id,
            "package_id": request.package_id,
            "amount_cents": int(package["price_amount"]),
            "credits": package["credits"],
            "currency": package["currency"],
            "provider": "paddle",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        })
        
        return PaddleTransactionResponse(
            checkout_url=checkout_url,
            transaction_id=transaction_id
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Paddle transaction: {str(e)}"
        )

@router.post("/webhook")
async def paddle_webhook(request: Request):
    """Handle Paddle webhooks for payment confirmation."""
    
    try:
        payload = await request.body()
        signature = request.headers.get('paddle-signature')
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Paddle signature"
            )
        
        # Verify webhook signature
        is_valid = paddle_service.verify_webhook_signature(payload, signature)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature"
            )
        
        # Parse webhook data
        webhook_data = await request.json()
        event_type = webhook_data.get("event_type")
        
        # Handle different event types
        if event_type == "transaction.completed":
            transaction_data = webhook_data.get("data", {})
            await handle_transaction_completed(transaction_data)
            
        elif event_type == "transaction.payment_failed":
            transaction_data = webhook_data.get("data", {})
            await handle_transaction_failed(transaction_data)
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        print(f"Paddle webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

async def handle_transaction_completed(transaction_data: Dict[str, Any]):
    """Handle completed transaction and update user credits."""
    try:
        transaction_id = transaction_data.get("id")
        custom_data = transaction_data.get("custom_data", {})
        
        # Get payment record from database
        payment_record = await db.get_payment_by_id(transaction_id)
        if not payment_record:
            print(f"Payment record not found: {transaction_id}")
            return
            
        # Skip if already processed
        if payment_record.get("status") == "completed":
            print(f"Payment already processed: {transaction_id}")
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
            "payment_id": transaction_id
        })
        
        # Update payment record status
        await db.update_payment_status(transaction_id, "completed", datetime.utcnow().isoformat())
        
        print(f"Paddle payment processed successfully: {transaction_id}, User: {user_id}, Credits added: {credits_to_add}")
        
    except Exception as e:
        print(f"Error processing Paddle payment success: {str(e)}")
        # Update payment record with error
        if 'transaction_id' in locals():
            await db.update_payment_status(transaction_id, "error", datetime.utcnow().isoformat())

async def handle_transaction_failed(transaction_data: Dict[str, Any]):
    """Handle failed transaction."""
    try:
        transaction_id = transaction_data.get("id")
        
        # Update payment record status
        await db.update_payment_status(transaction_id, "failed", datetime.utcnow().isoformat())
        print(f"Paddle payment failed: {transaction_id}")
        
    except Exception as e:
        print(f"Error processing Paddle payment failure: {str(e)}")

@router.get("/transaction/{transaction_id}")
async def get_paddle_transaction(
    transaction_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get Paddle transaction details."""
    try:
        # Verify user owns this transaction
        payment_record = await db.get_payment_by_id(transaction_id)
        if not payment_record or payment_record["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Get transaction from Paddle
        transaction_data = await paddle_service.get_transaction(transaction_id)
        
        return {
            "transaction": transaction_data,
            "local_record": payment_record
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transaction: {str(e)}"
        )

@router.get("/setup-info")
async def get_paddle_setup_info():
    """Get information needed to set up Paddle integration."""
    return {
        "message": "To complete Paddle setup:",
        "steps": [
            "1. Sign up at https://www.paddle.com/",
            "2. Create products for your credit packages in Paddle Dashboard",
            "3. Create prices for each product (starter: $9.99, pro: $39.99, enterprise: $99.99)",
            "4. Update the price_ids in paddle_payments.py with your actual Paddle price IDs",
            "5. Add your Paddle API key and webhook secret to .env file",
            "6. Set up webhook endpoint: {your-domain}/paddle/webhook"
        ],
        "required_env_vars": [
            "PADDLE_API_KEY",
            "PADDLE_WEBHOOK_SECRET",
            "PADDLE_ENVIRONMENT (sandbox or production)"
        ]
    }