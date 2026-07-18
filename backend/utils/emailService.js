exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
  
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 24px; font-weight: bold; color: #6366f1;">ShopPilot AI</span>
      </div>
      <p>Hello ${user.name || "there"},</p>
      <p>We received a request to reset your ShopPilot password.</p>
      <p>Click the button below to create a new password. This reset link is single-use and will expire in 15 minutes.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">
        If you did not request this reset, please ignore this email or contact support if you have concerns. For security, never forward this link.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        ShopPilot AI, Inc. &copy; 2026. All rights reserved.
      </p>
    </div>
  `;
  
  console.log("\n=================== BRANDED EMAIL SENT ===================");
  console.log(`To: ${user.email}`);
  console.log("Subject: ShopPilot Password Reset");
  console.log("HTML Content:\n", emailHtml);
  console.log("==========================================================\n");
};
