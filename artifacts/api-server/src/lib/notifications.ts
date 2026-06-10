import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, html: string) => {
  // Check for Resend/Brevo API keys first, fallback to SMTP
  const resendKey = process.env["RESEND_API_KEY"];
  const brevoKey = process.env["BREVO_API_KEY"];

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "OneTailor <onboarding@resend.dev>", // Replace with your domain
          to: [to],
          subject,
          html,
        }),
      });
      if (response.ok) return { success: true };
    } catch (e) {
      console.error("Resend Error:", e);
    }
  }

  // Fallback to standard SMTP
  if (!process.env["SMTP_USER"] || !process.env["SMTP_PASS"]) {
    console.warn("No email provider configured. Logging to console.");
    console.log(`[EMAIL to ${to}]: ${subject}`);
    return { success: false, error: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"] || "smtp.gmail.com",
    port: parseInt(process.env["SMTP_PORT"] || "587"),
    secure: false,
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
  });

  try {
    await transporter.sendMail({
      from: `"OneTailor Support" <${process.env["SMTP_USER"]}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
};

export const templates = {
  licenseActivated: (businessName: string, key: string) => ({
    subject: "Premium Unlocked! Your OneTailor License Key",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0f172a;">Welcome to OneTailor Pro, ${businessName}!</h2>
        <p>Your payment has been verified and your professional license is now active.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Your License Key</p>
          <h1 style="margin: 10px 0; font-family: monospace; color: #10b981; letter-spacing: -1px;">${key}</h1>
        </div>
        <p>You can now access all premium features including customer measurement saving, video compression, and more.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you need to change your device, use this email or key to restore your access.</p>
      </div>
    `
  }),
  manualPaymentReceived: (businessName: string, amount: number) => ({
    subject: "New Manual Payment Evidence Submitted",
    html: `
      <h3>New Payment Review Required</h3>
      <p><b>Business:</b> ${businessName}</p>
      <p><b>Amount:</b> ₦${amount.toLocaleString()}</p>
      <p>Please log in to the Admin Portal to review the evidence and approve/reject the payment.</p>
    `
  }),
  paymentRejected: (reason: string) => ({
    subject: "Update on your OneTailor Premium Payment",
    html: `
      <h3>Payment Verification Failed</h3>
      <p>We could not verify your manual payment transfer for the following reason:</p>
      <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
        ${reason}
      </div>
      <p>Please try re-uploading the correct evidence or contact support for help.</p>
    `
  })
};
