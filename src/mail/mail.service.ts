import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * CRITICAL EMAILS ONLY — 500/month limit enforced.
 * Triggers: new invite, account deactivated, placement confirmed, card assigned.
 * All other notifications are in-app only via Socket.io.
 */
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.fromEmail = config.get('MAIL_FROM') || 'bt23mme076@students.vnit.ac.in';
    this.frontendUrl = config.get('FRONTEND_URL') || 'https://ops.atyant.in';

    const smtpPort = parseInt(config.get('SMTP_PORT') || '587');
    const isSecure = smtpPort === 465; // 465 = SSL/TLS, 587 = STARTTLS
    
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs in dev
      },
    });

    // Verify connection on startup (non-blocking)
    this.transporter.verify((error) => {
      if (error) {
        this.logger.warn(`SMTP connection warning: ${error.message}`);
      } else {
        this.logger.log('✅ SMTP server is ready to send emails');
      }
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Atyant Ops" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent to ${to}: ${subject} (MessageID: ${info.messageId})`);
      return info;
    } catch (err) {
      // Log warning but do NOT re-throw — mail failure must never crash the API
      this.logger.warn(`⚠️ Failed to send email to ${to}: ${err.message}`);
      return null;
    }
  }

  async sendInvite(email: string, token: string) {
    this.logger.log(`🔄 Attempting to send invite email to ${email}`);
    const link = `${this.frontendUrl}/invite?token=${token}`;
    try {
      await this.send(
        email,
        'You have been invited to Atyant Ops',
        `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
          <div style="margin-bottom: 32px;">
            <span style="font-size: 22px; font-weight: 800; color: #6965BC; letter-spacing: -0.5px;">Atyant Ops</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0F0E1A; margin: 0 0 12px;">You have been invited</h2>
          <p style="color: #4B4869; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
            You have been invited to join the Atyant Ops internal platform. Click below to set up your account.
          </p>
          <a href="${link}" style="display: inline-block; background: #6965BC; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Accept Invite
          </a>
          <p style="color: #9896B8; font-size: 13px; margin-top: 28px;">
            This invite expires in 7 days. If you did not expect this email, ignore it safely.
          </p>
        </div>
        `,
      );
      this.logger.log(`✅ Invite email successfully sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send invite to ${email}:`, error.message);
      throw error;
    }
  }

  async sendAccountDeactivated(email: string, name: string) {
    await this.send(
      email,
      'Your Atyant Ops account has been deactivated',
      `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
        <span style="font-size: 22px; font-weight: 800; color: #6965BC;">Atyant Ops</span>
        <h2 style="font-size: 20px; color: #0F0E1A; margin-top: 28px;">Account Deactivated</h2>
        <p style="color: #4B4869; font-size: 15px; line-height: 1.6;">
          Hi ${name}, your Atyant Ops account has been deactivated by an administrator.
          Please reach out to your team lead if you believe this is an error.
        </p>
      </div>
      `,
    );
  }

  async sendPlacementConfirmed(
    email: string,
    studentName: string,
    roleTitle: string,
    company: string,
  ) {
    await this.send(
      email,
      `Placement Confirmed — ${studentName}`,
      `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
        <span style="font-size: 22px; font-weight: 800; color: #6965BC;">Atyant Ops</span>
        <h2 style="font-size: 20px; color: #0F0E1A; margin-top: 28px;">🎉 Placement Confirmed</h2>
        <p style="color: #4B4869; font-size: 15px; line-height: 1.6;">
          <strong>${studentName}</strong> has been placed as <strong>${roleTitle}</strong> at <strong>${company}</strong>.
          This has been logged in the OMTM dashboard.
        </p>
      </div>
      `,
    );
  }

  async sendTaskAssigned(
    email: string,
    assigneeName: string,
    taskTitle: string,
    priority: string,
    squad: string,
    dueDate?: string,
  ) {
    const dueDateStr = dueDate
      ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'No due date';

    await this.send(
      email,
      `Atyant Ops — New task assigned to you`,
      `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
        <span style="font-size: 22px; font-weight: 800; color: #6965BC; letter-spacing: -0.5px;">Atyant Ops</span>
        <h2 style="font-size: 20px; font-weight: 700; color: #0F0E1A; margin: 28px 0 12px;">📋 New Task Assigned</h2>
        <p style="color: #4B4869; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${assigneeName}</strong>, a new task has been assigned to you.
        </p>
        <div style="background: #F7F7FB; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 10px; color: #0F0E1A; font-weight: 700; font-size: 16px;">${taskTitle}</p>
          <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Squad:</strong> ${squad || '—'}</p>
          <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Priority:</strong> ${priority || '—'}</p>
          <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Due Date:</strong> ${dueDateStr}</p>
        </div>
        <a href="${this.frontendUrl}/dashboard" style="display: inline-block; background: #6965BC; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          View Task
        </a>
        <p style="color: #9896B8; font-size: 13px; margin-top: 28px;">
          You are receiving this because a task was assigned to you in Atyant Ops.
        </p>
      </div>
      `,
    );
  }
  async sendPrRequestToSir(
  taskTitle: string,
  submittedByName: string,
  squad: string,
  prLink1: string,
  prLink2: string,
  summary: string,
  submittedAt?: string,
) {
  const sirEmail = 'nitinrai2266@gmail.com';

  const submittedAtStr = submittedAt
    ? new Date(submittedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  await this.send(
    sirEmail,
    `Atyant Ops — PR Request Submitted`,
    `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
      <span style="font-size: 22px; font-weight: 800; color: #6965BC; letter-spacing: -0.5px;">Atyant Ops</span>

      <h2 style="font-size: 20px; font-weight: 700; color: #0F0E1A; margin: 28px 0 12px;">
        PR Request Submitted
      </h2>

      <p style="color: #4B4869; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        A Tech team member has submitted a PR request for review.
      </p>

      <div style="background: #F7F7FB; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; color: #0F0E1A; font-weight: 700; font-size: 16px;">${taskTitle}</p>
        <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Submitted By:</strong> ${submittedByName}</p>
        <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Squad:</strong> ${squad || 'TECH'}</p>
        <p style="margin: 4px 0; color: #4B4869; font-size: 14px;"><strong>Submitted At:</strong> ${submittedAtStr}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 8px; color: #0F0E1A; font-weight: 700; font-size: 14px;">GitHub PR Link 1</p>
        <a href="${prLink1}" style="color: #6965BC; font-size: 14px; word-break: break-all;">${prLink1}</a>
      </div>

      ${
        prLink2
          ? `
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 8px; color: #0F0E1A; font-weight: 700; font-size: 14px;">GitHub PR Link 2</p>
            <a href="${prLink2}" style="color: #6965BC; font-size: 14px; word-break: break-all;">${prLink2}</a>
          </div>
          `
          : ''
      }

      <div style="background: #FFFBEA; border: 1px solid #FDE68A; border-radius: 10px; padding: 16px 18px;">
        <p style="margin: 0 0 8px; color: #92400E; font-weight: 700; font-size: 14px;">Work Summary</p>
        <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">${summary || 'No summary provided'}</p>
      </div>

      <a href="${this.frontendUrl}/tasks" style="display: inline-block; background: #6965BC; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 24px;">
        View Task in OPS
      </a>
    </div>
    `,
  );
}


  async sendCardAssigned(
    email: string,
    assigneeName: string,
    entityType: string,
    entityName: string,
  ) {
    await this.send(
      email,
      `Atyant Ops — ${entityType} assigned to you`,
      `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
        <span style="font-size: 22px; font-weight: 800; color: #6965BC;">Atyant Ops</span>
        <h2 style="font-size: 20px; color: #0F0E1A; margin-top: 28px;">Card Assigned</h2>
        <p style="color: #4B4869; font-size: 15px; line-height: 1.6;">
          Hi ${assigneeName}, the ${entityType} <strong>${entityName}</strong> has been assigned to you in Atyant Ops.
        </p>
        <a href="${this.frontendUrl}/pipeline" style="display: inline-block; background: #6965BC; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 16px;">
          View in Ops
        </a>
      </div>
      `,
    );
  }
}
