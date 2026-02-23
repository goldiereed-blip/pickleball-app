import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(to: string, displayName: string, resetToken: string) {
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: 'Pickleball Round Robin <noreply@' + (process.env.RESEND_DOMAIN || 'resend.dev') + '>',
    to,
    subject: 'Reset Your Password — Pickleball Round Robin',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #5e3485; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="color: #374151; font-size: 16px;">Hi ${displayName},</p>
        <p style="color: #374151; font-size: 16px;">We received a request to reset your password. Click the button below to set a new one:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #5e3485; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Pickleball Round Robin</p>
      </div>
    `,
  });
}
