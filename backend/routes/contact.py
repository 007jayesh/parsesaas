from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional
from config import settings
from services.email_service import email_service

router = APIRouter()

class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class ContactFormResponse(BaseModel):
    success: bool
    message: str

@router.post("/contact/send-message", response_model=ContactFormResponse)
async def send_contact_message(
    contact_request: ContactFormRequest,
    background_tasks: BackgroundTasks
):
    """
    Send contact form message via email
    """
    try:
        # Validate required fields
        if not contact_request.name.strip():
            raise HTTPException(status_code=400, detail="Name is required")
        
        if not contact_request.message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        if not contact_request.subject.strip():
            raise HTTPException(status_code=400, detail="Subject is required")
        
        # Prepare form data
        form_data = {
            "name": contact_request.name.strip(),
            "email": str(contact_request.email).strip(),
            "subject": contact_request.subject.strip(),
            "message": contact_request.message.strip()
        }
        
        print(f"📧 Processing contact form from: {form_data['email']}")
        print(f"📧 Subject: {form_data['subject']}")
        
        # Try to send email to support team (synchronously to ensure it works)
        support_email_sent = email_service.send_contact_form_email(form_data)
        
        if not support_email_sent:
            # Log the contact form submission even if email fails
            print(f"📝 CONTACT FORM SUBMISSION (email failed):")
            print(f"   Name: {form_data['name']}")
            print(f"   Email: {form_data['email']}")
            print(f"   Subject: {form_data['subject']}")
            print(f"   Message: {form_data['message'][:100]}...")
            print(f"   Note: Email service unavailable - please check manually")
            
            # Still return success to user (they submitted successfully, email issue is technical)
            return ContactFormResponse(
                success=True,
                message="Thank you for your message! We've received it and will get back to you soon via email."
            )
        
        # Send confirmation email to user (in background)
        background_tasks.add_task(
            email_service.send_confirmation_email, 
            form_data
        )
        
        return ContactFormResponse(
            success=True,
            message="Thank you for your message! We'll get back to you soon."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Contact form error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while sending your message. Please try again later."
        )

@router.get("/contact/test-smtp")
async def test_smtp_connection():
    """
    Test SMTP connection (for development only)
    """
    try:
        import smtplib
        
        smtp_server = settings.smtp_server
        smtp_port = settings.smtp_port or 587
        smtp_username = settings.smtp_username
        smtp_password = settings.smtp_password
        
        print(f"Testing SMTP connection to {smtp_server}:{smtp_port}")
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            
        return {
            "success": True,
            "message": "SMTP connection successful",
            "server": smtp_server,
            "port": smtp_port
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"SMTP connection failed: {str(e)}",
            "server": settings.smtp_server,
            "port": settings.smtp_port
        }
