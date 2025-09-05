from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from pydantic import BaseModel, EmailStr
from models.user import UserCreate, UserLogin, GoogleOAuthLogin, Token, UserResponse
from services.auth import verify_password, get_password_hash, create_access_token, get_current_user
from database import db
from config import settings
from google.auth.transport import requests
from google.oauth2 import id_token
import secrets
import hashlib
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    try:
        # Check if user already exists
        existing_user = await db.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        new_user = await db.create_user({
            "name": user_data.name,
            "email": user_data.email,
            "password_hash": hashed_password,
            "credits": 10,  # 10 free credits for new users
            "plan": "free"
        })
        
        if not new_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Create credit transaction for signup bonus
        await db.create_credit_transaction({
            "user_id": new_user["id"],
            "amount": 10,
            "transaction_type": "signup_bonus",
            "description": "Welcome bonus - 10 free credits"
        })
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": new_user["id"]},
            expires_delta=access_token_expires
        )
    
        user_response = UserResponse(
            id=new_user["id"],
            name=new_user["name"],
            email=new_user["email"],
            credits=new_user["credits"],
            plan=new_user["plan"],
            created_at=new_user["created_at"]
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    # Get user from database
    user = await db.get_user_by_email(user_credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        credits=user["credits"],
        plan=user["plan"],
        created_at=user["created_at"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@router.post("/google", response_model=Token)
async def google_oauth_login(oauth_data: GoogleOAuthLogin):
    try:
        # Verify the Google OAuth token
        if not settings.google_client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured"
            )
        
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            oauth_data.token, 
            requests.Request(), 
            settings.google_client_id
        )
        
        # Get user info from token
        email = idinfo.get('email')
        name = idinfo.get('name')
        google_id = idinfo.get('sub')
        
        if not email or not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token - missing user information"
            )
        
        # Check if user exists
        existing_user = await db.get_user_by_email(email)
        
        if existing_user:
            # User exists, log them in
            user = existing_user
        else:
            # Create new user
            user = await db.create_user({
                "name": name,
                "email": email,
                "password_hash": "",  # Google users don't need password
                "credits": 10,  # 10 free credits for new users
                "plan": "free",
                "google_id": google_id  # Store Google ID for future reference
            })
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            # Create credit transaction for signup bonus
            await db.create_credit_transaction({
                "user_id": user["id"],
                "amount": 10,
                "transaction_type": "signup_bonus",
                "description": "Welcome bonus - 10 free credits (Google signup)"
            })
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user["id"]},
            expires_delta=access_token_expires
        )
        
        user_response = UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            credits=user["credits"],
            plan=user["plan"],
            created_at=user["created_at"]
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        print(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed"
        )

# Pydantic models for password reset
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    try:
        # Check if user exists
        user = await db.get_user_by_email(request.email)
        if not user:
            # Don't reveal if email exists or not for security
            return {"message": "If this email is registered, you will receive a password reset link."}
        
        # Generate secure random token
        reset_token = secrets.token_urlsafe(32)
        
        # Hash the token before storing (security best practice)
        token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
        
        # Set expiration time (1 hour from now)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Store reset token in database
        await db.create_password_reset_token({
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat()
        })
        
        # TODO: Send email with reset link
        # For now, we'll just log the token (in production, send via email)
        print(f"Password reset token for {request.email}: {reset_token}")
        
        return {"message": "If this email is registered, you will receive a password reset link."}
        
    except Exception as e:
        print(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    try:
        # Hash the provided token to compare with stored hash
        token_hash = hashlib.sha256(request.token.encode()).hexdigest()
        
        # Find valid reset token
        reset_token = await db.get_password_reset_token(token_hash)
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token has expired
        expires_at = datetime.fromisoformat(reset_token["expires_at"].replace('Z', '+00:00')) if isinstance(reset_token["expires_at"], str) else reset_token["expires_at"]
        if datetime.utcnow() > expires_at:
            # Clean up expired token
            await db.delete_password_reset_token(token_hash)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Get user
        user = await db.get_user_by_id(reset_token["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Hash new password
        new_password_hash = get_password_hash(request.new_password)
        
        # Update user password
        await db.update_user_password(user["id"], new_password_hash)
        
        # Delete the used reset token
        await db.delete_password_reset_token(token_hash)
        
        return {"message": "Password has been successfully reset"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

