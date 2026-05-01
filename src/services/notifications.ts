/**
 * Multi-channel notification service
 * Supports: Email (Resend), Telegram, Discord, Slack
 */

import { Resend } from "resend";
import TelegramBot from "node-telegram-bot-api";
import { Client as DiscordClient, GatewayIntentBits, TextChannel } from "discord.js";

// Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "alerts@getstreetinsights.com";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export type NotificationChannel = "email" | "telegram" | "discord" | "slack" | "all";

export interface NotificationPayload {
  subject?: string; // For email
  message: string; // Plain text or markdown
  html?: string; // For email
  to?: string; // Email recipient (overrides default)
}

export class NotificationService {
  private resend: Resend | null = null;
  private telegram: TelegramBot | null = null;
  private discord: DiscordClient | null = null;

  constructor() {
    // Initialize Resend
    if (RESEND_API_KEY) {
      this.resend = new Resend(RESEND_API_KEY);
    }

    // Initialize Telegram (polling disabled for webhook mode)
    if (TELEGRAM_BOT_TOKEN) {
      this.telegram = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
    }

    // Initialize Discord (connection is lazy - only when needed)
    if (DISCORD_BOT_TOKEN) {
      this.discord = new DiscordClient({
        intents: [GatewayIntentBits.Guilds],
      });
    }
  }

  /**
   * Send notification to specified channel(s)
   */
  async send(payload: NotificationPayload, channels: NotificationChannel[] = ["email"]): Promise<void> {
    const results = await Promise.allSettled(
      channels.map((channel) => {
        if (channel === "all") {
          return this.sendToAll(payload);
        }
        return this.sendToChannel(channel, payload);
      })
    );

    // Log failures but don't throw
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(`[NotificationService] ${failures.length} channel(s) failed:`, failures);
    }
  }

  /**
   * Send to all configured channels
   */
  private async sendToAll(payload: NotificationPayload): Promise<void> {
    const channels: NotificationChannel[] = [];
    if (this.resend) channels.push("email");
    if (this.telegram && TELEGRAM_CHAT_ID) channels.push("telegram");
    if (this.discord && DISCORD_CHANNEL_ID) channels.push("discord");
    if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) channels.push("slack");

    await Promise.allSettled(channels.map((ch) => this.sendToChannel(ch, payload)));
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    switch (channel) {
      case "email":
        await this.sendEmail(payload);
        break;
      case "telegram":
        await this.sendTelegram(payload);
        break;
      case "discord":
        await this.sendDiscord(payload);
        break;
      case "slack":
        await this.sendSlack(payload);
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send email via Resend
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    if (!this.resend) {
      throw new Error("Resend not configured");
    }

    if (!payload.to && !process.env.DEFAULT_ALERT_EMAIL) {
      throw new Error("No email recipient specified");
    }

    await this.resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to || process.env.DEFAULT_ALERT_EMAIL!,
      subject: payload.subject || "Street Insights Alert",
      html: payload.html || `<pre>${payload.message}</pre>`,
    });

    console.log(`[NotificationService] ✓ Email sent to ${payload.to || process.env.DEFAULT_ALERT_EMAIL}`);
  }

  /**
   * Send message to Telegram
   */
  private async sendTelegram(payload: NotificationPayload): Promise<void> {
    if (!this.telegram || !TELEGRAM_CHAT_ID) {
      throw new Error("Telegram not configured");
    }

    // Telegram supports markdown
    await this.telegram.sendMessage(TELEGRAM_CHAT_ID, payload.message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

    console.log(`[NotificationService] ✓ Telegram message sent to ${TELEGRAM_CHAT_ID}`);
  }

  /**
   * Send message to Discord
   */
  private async sendDiscord(payload: NotificationPayload): Promise<void> {
    if (!this.discord || !DISCORD_CHANNEL_ID || !DISCORD_BOT_TOKEN) {
      throw new Error("Discord not configured");
    }

    // Login if not already connected
    if (!this.discord.isReady()) {
      await this.discord.login(DISCORD_BOT_TOKEN);
      // Wait for ready event
      await new Promise<void>((resolve) => {
        this.discord!.once("ready", () => resolve());
      });
    }

    const channel = await this.discord.channels.fetch(DISCORD_CHANNEL_ID);
    if (!channel || !(channel instanceof TextChannel)) {
      throw new Error(`Discord channel ${DISCORD_CHANNEL_ID} not found or not a text channel`);
    }

    // Discord supports markdown
    await channel.send(payload.message);

    console.log(`[NotificationService] ✓ Discord message sent to ${DISCORD_CHANNEL_ID}`);
  }

  /**
   * Send message to Slack
   */
  private async sendSlack(payload: NotificationPayload): Promise<void> {
    if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
      throw new Error("Slack not configured");
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: payload.message,
        mrkdwn: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack error: ${data.error}`);
    }

    console.log(`[NotificationService] ✓ Slack message sent to ${SLACK_CHANNEL_ID}`);
  }

  /**
   * Get list of configured channels
   */
  getConfiguredChannels(): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    if (this.resend && (process.env.DEFAULT_ALERT_EMAIL || FROM_EMAIL)) channels.push("email");
    if (this.telegram && TELEGRAM_CHAT_ID) channels.push("telegram");
    if (this.discord && DISCORD_CHANNEL_ID) channels.push("discord");
    if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) channels.push("slack");
    return channels;
  }

  /**
   * Cleanup (disconnect bots)
   */
  async dispose(): Promise<void> {
    if (this.discord && this.discord.isReady()) {
      await this.discord.destroy();
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
