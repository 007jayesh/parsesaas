from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleOAuthLogin(BaseModel):
    token: str

class User(BaseModel):
    id: str
    name: str
    email: str
    credits: int
    plan: str
    created_at: datetime
    updated_at: datetime

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    credits: int
    plan: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse