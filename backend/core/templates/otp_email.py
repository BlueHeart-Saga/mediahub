def build_otp_email(otp: str, company_id: str):
    return f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Admin Access Verification</h2>

        <p>Your one-time password (OTP):</p>

        <div style="
            font-size: 28px;
            font-weight: bold;
            margin: 20px 0;
            letter-spacing: 4px;
        ">
            {otp}
        </div>

        <p>This code will expire in <b>10 minutes</b>.</p>

        <hr style="margin: 20px 0;" />

        <small>
            Company: {company_id} <br/>
            If you did not request this, ignore this email.
        </small>
    </div>
    """