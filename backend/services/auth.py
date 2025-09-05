from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings
from database import db
import httpx
from models.user import UserResponse
from fastapi import WebSocket

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token scheme
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{db.base_url}/users?id=eq.{user_id}&select=id,name,email,credits,plan,created_at",
            headers=db.headers
        )
        user_data_list = response.json()
        if not user_data_list:
            raise credentials_exception
        
        user_data = user_data_list[0]
    return UserResponse(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data["email"],
        credits=user_data["credits"],
        plan=user_data["plan"],
        created_at=user_data["created_at"]
    )

async def get_current_user_websocket(token: str) -> UserResponse:
    """Get current user from JWT token for WebSocket connections"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{db.base_url}/users?id=eq.{user_id}&select=id,name,email,credits,plan,created_at",
            headers=db.headers
        )
        user_data_list = response.json()
        if not user_data_list:
            raise credentials_exception
        
        user_data = user_data_list[0]
    return UserResponse(
        id=user_data["id"],
        name=user_data["name"],
        email=user_data["email"],
        credits=user_data["credits"],
        plan=user_data["plan"],
        created_at=user_data["created_at"]
    )