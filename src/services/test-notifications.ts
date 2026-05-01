/**
 * Quick test script for notification service
 * Usage: npx tsx src/services/test-notifications.ts
 */

import "dotenv/config";
import { notificationService } from "./notifications.js";

async function testNotifications() {
  console.log("🧪 Testing Notification Service\n");

  const configured = notificationService.getConfiguredChannels();
  console.log(`✓ Configured channels: ${configured.join(", ")}\n`);

  if (configured.length === 0) {
    console.log("⚠️  No notification channels configured. Add to .env:");
    console.log("  Email:");
    console.log("    - RESEND_API_KEY");
    console.log("    - DEFAULT_ALERT_EMAIL (recipient)");
    console.log("  Telegram:");
    console.log("    - TELEGRAM_BOT_TOKEN");
    console.log("    - TELEGRAM_CHAT_ID");
    console.log("  Discord:");
    console.log("    - DISCORD_BOT_TOKEN");
    console.log("    - DISCORD_CHANNEL_ID");
    console.log("  Slack:");
    console.log("    - SLACK_BOT_TOKEN");
    console.log("    - SLACK_CHANNEL_ID\n");
    process.exit(1);
  }

  try {
    console.log(`Sending test notification to: ${configured.join(", ")}...\n`);

    await notificationService.send(
      {
        subject: "Street Insights Test Alert",
        message: `🚀 **Street Insights Test**

This is a test notification from the multi-channel notification system.

**Configured channels:** ${configured.join(", ")}

If you're seeing this, the integration is working!`,
        html: `
          <h2>🚀 Street Insights Test</h2>
          <p>This is a test notification from the multi-channel notification system.</p>
          <p><strong>Configured channels:</strong> ${configured.join(", ")}</p>
          <p>If you're seeing this, the integration is working!</p>
        `,
      },
      configured
    );

    console.log("✅ Test passed! Check your channels for the test message.");

    // Cleanup
    await notificationService.dispose();
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testNotifications();
