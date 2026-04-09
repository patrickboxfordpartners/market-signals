import { inngest } from "../client.js";
import { supabase } from "../../integrations/supabase/client.js";

const XAI_API_KEY = process.env.XAI_API_KEY;

export const generateDebateSummary = inngest.createFunction(
  {
    id: "generate-debate-summary",
    name: "Generate blog post from RoundtAIble debates",
    triggers: [{ cron: "0 10 * * *" }] // Daily at 10am
  },
  async ({ step }) => {

    // Check for new debates that haven't been turned into content yet
    const existingIds = await step.run("fetch-existing-drafts", async () => {
      const { data } = await supabase
        .from("content_drafts")
        .select("metadata")
        .eq("source", "roundtaible");

      return (data || [])
        .map((d: Record<string, unknown>) => {
          const meta = d.metadata as Record<string, unknown> | null;
          return meta?.debate_id;
        })
        .filter(Boolean) as string[];
    });

    // Query debates table (same Supabase instance as content_drafts)
    const debateData = await step.run("check-for-debates", async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await supabase
        .from("debates")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Failed to query Roundtaible debates:", error);
        return null;
      }

      // Find first debate not already converted to content
      const fresh = (data || []).find(
        (d: Record<string, unknown>) => !existingIds.includes(d.id as string)
      );
      return fresh || null;
    });

    if (!debateData) {
      return { status: "skipped", reason: "No new debates to summarize" };
    }

    // Generate blog draft
    const draft = await step.run("generate-draft", async () => {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");

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
              content: `You are writing a blog post for Boxford Partners based on an AI debate from RoundtAIble (roundtaible.com). The post should distill key arguments from both sides into an accessible, thought-provoking article. Professional tone, 600-1000 words. Include a brief intro about RoundtAIble as an AI debate platform.`,
            },
            {
              role: "user",
              content: `Write a blog post based on this debate.\n\nTopic: "${(debateData as Record<string, unknown>).topic_title}"\nCategory: ${(debateData as Record<string, unknown>).topic_category}\nParticipants: ${JSON.stringify((debateData as Record<string, unknown>).personas)}\n\nTranscript:\n${JSON.stringify((debateData as Record<string, unknown>).transcript)}`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    });

    const saved = await step.run("save-draft", async () => {
      const { data, error } = await supabase
        .from("content_drafts")
        .insert({
          source: "roundtaible",
          type: "blog",
          title: `RoundtAIble: ${(debateData as Record<string, unknown>).topic_title}`,
          body: draft,
          metadata: { debate_id: (debateData as Record<string, unknown>).id },
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    });

    return { status: "created", draftId: saved.id };
  }
);
