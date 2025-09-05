import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any
from config import settings

class EmailService:
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port or 587
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.from_name = settings.smtp_from_name
        self.contact_to_email = settings.contact_to_email
    
    def send_contact_form_email(self, form_data: Dict[str, Any]) -> bool:
        """Send contact form submission to support team"""
        # Try multiple SMTP configurations for GoDaddy
        smtp_configs = [
            {'server': self.smtp_server, 'port': self.smtp_port, 'use_tls': True, 'timeout': 10},
            {'server': self.smtp_server, 'port': 465, 'use_ssl': True, 'timeout': 10},
            {'server': self.smtp_server, 'port': 25, 'use_tls': True, 'timeout': 10},
            {'server': 'mail.thebankstatementparser.com', 'port': 587, 'use_tls': True, 'timeout': 10},
        ]
        
        for config in smtp_configs:
            try:
                print(f"🔄 Trying SMTP {config['server']}:{config['port']} (SSL: {config.get('use_ssl', False)}, TLS: {config.get('use_tls', False)})")
                
                # Create message
                msg = MIMEMultipart()
                msg['From'] = f"{self.from_name} <{self.from_email}>"
                msg['To'] = self.contact_to_email
                msg['Subject'] = f"Contact Form: {form_data.get('subject', 'General Inquiry')}"
                msg['Reply-To'] = form_data.get('email')
                
                # Create email body
                body = self._create_contact_email_body(form_data)
                msg.attach(MIMEText(body, 'html'))
                
                # Try sending with current config
                if config.get('use_ssl'):
                    # Use SMTP_SSL for port 465
                    with smtplib.SMTP_SSL(config['server'], config['port'], timeout=config['timeout']) as server:
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                else:
                    # Use regular SMTP with STARTTLS for other ports
                    with smtplib.SMTP(config['server'], config['port'], timeout=config['timeout']) as server:
                        if config.get('use_tls'):
                            server.starttls()
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                
                print(f"✅ Contact form email sent successfully via {config['server']}:{config['port']}")
                return True
                
            except Exception as e:
                print(f"❌ Failed with {config['server']}:{config['port']} - {str(e)}")
                continue
        
        print(f"❌ All SMTP configurations failed")
        return False
    
    def send_confirmation_email(self, form_data: Dict[str, Any]) -> bool:
        """Send confirmation email to user who submitted the form"""
        # Try multiple SMTP configurations for GoDaddy
        smtp_configs = [
            {'server': self.smtp_server, 'port': self.smtp_port, 'use_tls': True, 'timeout': 10},
            {'server': self.smtp_server, 'port': 465, 'use_ssl': True, 'timeout': 10},
            {'server': self.smtp_server, 'port': 25, 'use_tls': True, 'timeout': 10},
            {'server': 'mail.thebankstatementparser.com', 'port': 587, 'use_tls': True, 'timeout': 10},
        ]
        
        for config in smtp_configs:
            try:
                print(f"🔄 Trying confirmation email via {config['server']}:{config['port']}")
                
                # Create message
                msg = MIMEMultipart()
                msg['From'] = f"{self.from_name} <{self.from_email}>"
                msg['To'] = form_data.get('email')
                msg['Subject'] = "Thank you for contacting us - We've received your message"
                
                # Create confirmation email body
                body = self._create_confirmation_email_body(form_data)
                msg.attach(MIMEText(body, 'html'))
                
                # Try sending with current config
                if config.get('use_ssl'):
                    # Use SMTP_SSL for port 465
                    with smtplib.SMTP_SSL(config['server'], config['port'], timeout=config['timeout']) as server:
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                else:
                    # Use regular SMTP with STARTTLS for other ports
                    with smtplib.SMTP(config['server'], config['port'], timeout=config['timeout']) as server:
                        if config.get('use_tls'):
                            server.starttls()
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                
                print(f"✅ Confirmation email sent successfully via {config['server']}:{config['port']}")
                return True
                
            except Exception as e:
                print(f"❌ Confirmation email failed with {config['server']}:{config['port']} - {str(e)}")
                continue
        
        print(f"❌ All SMTP configurations failed for confirmation email")
        return False
    
    def _create_contact_email_body(self, form_data: Dict[str, Any]) -> str:
        """Create HTML email body for contact form submission"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Contact Form Submission</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #ff5941; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .field {{ margin-bottom: 15px; }}
                .field-label {{ font-weight: bold; color: #555; }}
                .field-value {{ margin-top: 5px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #ff5941; }}
                .footer {{ background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>New Contact Form Submission</h1>
                <p>The Bank Statement Parser</p>
            </div>
            
            <div class="content">
                <div class="field">
                    <div class="field-label">Name:</div>
                    <div class="field-value">{form_data.get('name', 'Not provided')}</div>
                </div>
                
                <div class="field">
                    <div class="field-label">Email:</div>
                    <div class="field-value">{form_data.get('email', 'Not provided')}</div>
                </div>
                
                <div class="field">
                    <div class="field-label">Subject:</div>
                    <div class="field-value">{form_data.get('subject', 'General Inquiry')}</div>
                </div>
                
                <div class="field">
                    <div class="field-label">Message:</div>
                    <div class="field-value">{form_data.get('message', 'No message provided').replace(chr(10), '<br>')}</div>
                </div>
            </div>
            
            <div class="footer">
                <p>Submitted on: {timestamp}</p>
                <p>This email was sent from the contact form on thebankstatementparser.com</p>
            </div>
        </body>
        </html>
        """
    
    def _create_confirmation_email_body(self, form_data: Dict[str, Any]) -> str:
        """Create HTML confirmation email body for user"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Thank you for contacting us</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #ff5941; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .highlight {{ background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .footer {{ background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Thank You for Contacting Us!</h1>
                <p>The Bank Statement Parser</p>
            </div>
            
            <div class="content">
                <p>Hi {form_data.get('name', 'there')},</p>
                
                <p>Thank you for reaching out to us! We've successfully received your message regarding <strong>"{form_data.get('subject', 'your inquiry')}"</strong>.</p>
                
                <div class="highlight">
                    <h3>What happens next?</h3>
                    <ul>
                        <li><strong>General inquiries:</strong> We'll respond within 24 hours</li>
                        <li><strong>Technical support:</strong> We'll get back to you within 12 hours</li>
                        <li><strong>Parsing errors:</strong> We'll investigate and respond within 6 hours</li>
                        <li><strong>Enterprise customers:</strong> We'll contact you within 2 hours</li>
                    </ul>
                </div>
                
                <p>In the meantime, feel free to:</p>
                <ul>
                    <li><a href="https://thebankstatementparser.com">Try our parsing service</a> if you haven't already</li>
                    <li><a href="https://thebankstatementparser.com/about">Learn more about our service</a></li>
                    <li><a href="https://thebankstatementparser.com/pricing">View our pricing plans</a></li>
                </ul>
                
                <p>We appreciate your interest in The Bank Statement Parser and look forward to helping you!</p>
                
                <p>Best regards,<br>
                <strong>The Bank Statement Parser Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated response. Please do not reply to this email.</p>
                <p>If you need immediate assistance, please visit our contact page.</p>
            </div>
        </body>
        </html>
        """

# Initialize email service
email_service = EmailService()
