# core/templates/super_admin_invite.py
from datetime import datetime, timedelta


def build_super_admin_invite_email(
    name: str,
    otp: str,
    frontend_url: str
) -> str:
    """
    Build HTML email for super admin invitation
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Mediahub</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #333333; margin: 0 0 20px 0;">Hello {name},</h2>
                                
                                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                    You have been invited to become a <strong>Super Administrator</strong> for Mediahub. 
                                    As a Super Admin, you will have full platform access and control over all companies, 
                                    users, and content.
                                </p>
                                
                                <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                    To complete your registration and set up your account, please use the following 
                                    One-Time Password (OTP):
                                </p>
                                
                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace;">
                                                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">{otp}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #666666; line-height: 1.6; margin: 20px 0;">
                                    <strong>This OTP will expire in 10 minutes.</strong>
                                </p>
                                
                                <!-- Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <a href="{frontend_url}/verify-otp?email=PLACEHOLDER_EMAIL" 
                                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                      color: #ffffff; 
                                                      padding: 14px 40px; 
                                                      text-decoration: none; 
                                                      border-radius: 5px; 
                                                      font-weight: bold;
                                                      display: inline-block;">
                                                Complete Registration
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                    If you didn't expect this invitation, you can safely ignore this email.
                                </p>
                                
                                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">
                                
                                <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
                                    &copy; {datetime.now().year} Mediahub. All rights reserved.
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