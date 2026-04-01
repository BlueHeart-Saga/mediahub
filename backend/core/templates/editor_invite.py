def build_editor_invite_email(company_name: str, name: str, otp: str, frontend_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; border: 1px solid #e9ecef;">
            <h2 style="color: #1a73e8; margin-top: 0;">Welcome to {company_name}!</h2>
            
            <p>Hello <strong>{name}</strong>,</p>
            
            <p>You have been invited to become an editor for <strong>{company_name}</strong>.</p>
            
            <div style="background-color: #e8f0fe; border-radius: 5px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 16px;">Your one-time password (OTP) is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a73e8; margin: 10px 0;">{otp}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This OTP will expire in 10 minutes.</p>
            </div>
            
            <p>To complete your registration and set up your password, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/verify-otp?email={otp}" 
                   style="background-color: #1a73e8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Complete Registration
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #1a73e8; font-size: 14px; word-break: break-all;">{frontend_url}/verify-otp</p>
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message, please do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """