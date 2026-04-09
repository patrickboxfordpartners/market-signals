import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";
import { createClient } from "@supabase/supabase-js";

const XAI_API_KEY = process.env.XAI_API_KEY;
const REVIEWSNIPER_URL = process.env.REVIEWSNIPER_SUPABASE_URL;
const REVIEWSNIPER_KEY = process.env.REVIEWSNIPER_SUPABASE_SERVICE_KEY;

export const generateReviewRoundup = inngest.createFunction(
  {
    id: "generate-review-roundup",
    name: "Generate weekly ReviewSniper roundup",
    triggers: [{ cron: "0 9 * * 1" }] // Mondays at 9am
  },
  async ({ step }) => {
    if (!REVIEWSNIPER_URL || !REVIEWSNIPER_KEY) {
      return { status: "skipped", reason: "ReviewSniper credentials not set" };
    }

    const rsClient = createClient(REVIEWSNIPER_URL, REVIEWSNIPER_KEY);

    // Fetch last week's review data
    const weekData = await step.run("fetch-week-data", async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();

      const [requests, accounts] = await Promise.all([
        rsClient
          .from("review_requests")
          .select("id, status, platform, created_at")
          .gte("created_at", since),
        rsClient
          .from("accounts")
          .select("id, business_name, is_active")
          .eq("is_active", true),
      ]);

      return {
        requests: requests.data || [],
        activeAccounts: accounts.data || [],
        totalRequests: requests.data?.length || 0,
      };
    });

    if (weekData.totalRequests === 0 && weekData.activeAccounts.length === 0) {
      return { status: "skipped", reason: "No ReviewSniper activity this week" };
    }

    // Generate roundup
    const draft = await step.run("generate-draft", async () => {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");

      const platformBreakdown = weekData.requests.reduce(
        (acc: Record<string, number>, r: Record<string, unknown>) => {
          const platform = String(r.platform || "unknown");
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            {
              role: "system",
              content: `You are writing a weekly product update for ReviewSniper (reviewsniper.app), a review management SaaS built by Boxford Partners. Write for LinkedIn — professional, concise, data-forward. Under 1300 characters. No emojis. 2-3 hashtags max.`,
            },
            {
              role: "user",
              content: `Write a weekly ReviewSniper update post.\n\nThis week:\n- ${weekData.activeAccounts.length} active accounts\n- ${weekData.totalRequests} review requests sent\n- Platform breakdown: ${JSON.stringify(platformBreakdown)}\n\nFrame as product traction update. Highlight growth or interesting patterns.`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    });

    // Save to content_drafts
    const saved = await step.run("save-draft", async () => {
      const { data, error } = await supabase
        .from("content_drafts")
        .insert({
          source: "reviewsniper",
          type: "linkedin",
          title: `ReviewSniper Weekly: ${weekData.totalRequests} requests, ${weekData.activeAccounts.length} active accounts`,
          body: draft,
          metadata: {
            week_requests: weekData.totalRequests,
            active_accounts: weekData.activeAccounts.length,
          },
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    });

    return { status: "created", draftId: saved.id };
  }
);
