import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "alerts@marketsignals.com";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("Resend not configured. Email would have been sent:", options.subject);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || `<pre>${options.text}</pre>`,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }

    console.log("Email sent successfully:", data?.id);
    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function sendWebhook(url: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MarketSignals/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}` };
    }

    console.log("Webhook sent successfully to:", url);
    return { success: true };
  } catch (err: any) {
    console.error("Webhook send error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
