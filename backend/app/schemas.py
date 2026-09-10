from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str = "user"
    is_admin: bool = False
    is_guest: bool = False
    is_verified: bool = False
    guest_query_count: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6)


class ResendOTPRequest(BaseModel):
    email: EmailStr


class DocumentOut(BaseModel):
    id: str
    filename: str
    filetype: str
    status: str
    num_chunks: int
    error_message: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    document_name: Optional[str] = None  # Preserved filename placeholder for erased files
    tokens_used: Optional[Any] = None
    sources: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AskRequest(BaseModel):
    session_id: Optional[str] = None
    question: str
    document_id: Optional[str] = None  # restrict to one document if provided
    model: Optional[str] = None  # dynamic Groq model selection


class AskResponse(BaseModel):
    session_id: str
    answer: str
    document_name: Optional[str] = None
    tokens_used: Optional[dict] = None
    sources: List[Any]


class ActivityOut(BaseModel):
    id: str
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserRow(BaseModel):
    id: str
    username: str
    email: str
    role: str
    is_guest: bool
    is_verified: bool
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    num_documents: int
    num_chat_sessions: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminStatsOut(BaseModel):
    total_users: int
    registered_users: int
    guest_users: int
    total_documents: int
    total_chat_sessions: int
    total_messages: int
    total_tokens_consumed: int


class UserDashboardOut(BaseModel):
    user: UserOut
    num_documents: int
    num_chat_sessions: int
    num_messages: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
