const nodemailer = require('nodemailer');
const { describeAllowedDomains } = require('../utils/emailDomains');

/**
 * Service to send faculty invitation emails via SMTP
 */
class EmailService {
  /**
   * Check if SMTP configuration is present
   */
  isConfigured() {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  /**
   * Get nodemailer transport
   */
  getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send an invitation email to faculty
   * @param {Object} params - { toEmail, coordinatorName, departmentName, programmeName }
   * @returns {Promise<{ sent: boolean, error?: string }>}
   */
  async sendFacultyInvitation({ toEmail, coordinatorName, departmentName, programmeName }) {
    if (!this.isConfigured()) {
      return { sent: false, error: 'SMTP not configured' };
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const loginUrl = `${frontendUrl}/login`;
      const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@mitsgwalior.in';

      const subject = `Invitation to join MITS Gwalior OBE Platform - ${departmentName || 'School / Centre'}`;
      const textContent = `Hello,

You have been invited by ${coordinatorName || 'your OBE Coordinator'} to join the Outcome Based Education (OBE) Platform for ${departmentName || 'your school / centre'}${programmeName ? ` (${programmeName})` : ''}.

Please access the platform using the following link:
${loginUrl}

Sign in with your ${describeAllowedDomains()} Google account.

Regards,
MITS Gwalior OBE Platform`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b; margin-top: 0;">MITS Gwalior OBE Platform</h2>
          <p>Hello,</p>
          <p>
            You have been invited by <strong>${coordinatorName || 'your OBE Coordinator'}</strong> to join the Outcome Based Education platform for <strong>${departmentName || 'your school / centre'}</strong>${programmeName ? ` (<strong>${programmeName}</strong>)` : ''}.
          </p>
          <div style="margin: 25px 0;">
            <a href="${loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Access OBE Platform
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            <strong>Note:</strong> Sign in with your <strong>${describeAllowedDomains()}</strong> Google account.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Madhav Institute of Technology &amp; Science, Gwalior
          </p>
        </div>
      `;

      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: mailFrom,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return { sent: true };
    } catch (err) {
      // Never log SMTP credentials or sensitive error details
      console.warn(`[EmailService] Failed to send invitation to ${toEmail}: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
