from datetime import datetime, timedelta

def build_reset_password_email(otp: str, company_name: str = "Mediahub") -> str:
    """
    Build HTML email for password reset
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f9fc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e6ebf1;">
                                <h1 style="margin: 0; color: #1a73e8; font-size: 28px; font-weight: 600;">{company_name}</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px 0; color: #202124; font-size: 24px; font-weight: 500;">Reset Your Password</h2>
                                
                                <p style="margin: 0 0 20px 0; color: #5f6368; font-size: 16px; line-height: 1.5;">
                                    We received a request to reset your password. Use the OTP code below to complete the process. This code will expire in 10 minutes.
                                </p>
                                
                                <!-- OTP Box -->
                                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #1a73e8;">
                                    <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #1a73e8; font-family: 'Courier New', monospace;">{otp}</div>
                                </div>
                                
                                <!-- Security Notice -->
                                <div style="background-color: #fff3e0; border-radius: 8px; padding: 20px; margin: 30px 0;">
                                    <p style="margin: 0; color: #e37400; font-size: 14px; line-height: 1.5;">
                                        <strong>🔒 Security Tip:</strong> Never share this OTP with anyone. Our team will never ask for your password or OTP.
                                    </p>
                                </div>
                                
                                <p style="margin: 20px 0 0 0; color: #5f6368; font-size: 14px; line-height: 1.5;">
                                    If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e6ebf1;">
                                <p style="margin: 0; color: #5f6368; font-size: 14px; line-height: 1.5; text-align: center;">
                                    This is an automated message from {company_name}. Please do not reply to this email.
                                </p>
                                <p style="margin: 10px 0 0 0; color: #5f6368; font-size: 12px; line-height: 1.5; text-align: center;">
                                    © {datetime.utcnow().year} {company_name}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """