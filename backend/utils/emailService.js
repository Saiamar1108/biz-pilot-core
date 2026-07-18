const nodemailer = require("nodemailer");
const env = require("../config/env");

exports.sendPasswordResetEmail = async (user, resetToken) => {
  // If SMTP is not configured, throw a clear configuration error
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP email credentials are not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.");
  }

  const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 26px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px;">ShopPilot AI</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Reset your ShopPilot password</h2>
      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
        Hello ${user.name || "there"},<br/><br/>
        We received a request to reset the password for your ShopPilot AI account. Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">Reset Password</a>
      </div>
      <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 24px 0 0 0;">
        <strong>Expiration notice:</strong> This link is single-use and will expire in <strong>15 minutes</strong>.<br/>
        <strong>Security warning:</strong> If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized access. Never forward this link to anyone.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="font-size: 11px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">
        ShopPilot AI, Inc. &bull; 100 Pine Street, San Francisco, CA 94111<br/>
        &copy; 2026 ShopPilot AI. All rights reserved.
      </p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465, // Use SSL/TLS for port 465
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  console.log(`[emailService] Sending password reset email to ${user.email}...`);

  const mailOptions = {
    from: env.emailFrom,
    to: user.email,
    subject: "ShopPilot Password Reset",
    html: emailHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[emailService] Reset email successfully delivered:", info.messageId);
    return info;
  } catch (error) {
    console.error("[emailService] Failed to deliver reset email:", error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
