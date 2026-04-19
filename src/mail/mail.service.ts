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

    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: parseInt(config.get('SMTP_PORT') || '465'),
      secure: true,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"Atyant Ops" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }

  async sendInvite(email: string, token: string) {
    const link = `${this.frontendUrl}/invite?token=${token}`;
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
