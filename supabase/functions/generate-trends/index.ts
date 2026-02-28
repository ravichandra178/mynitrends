import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchTrendsFromRSS(): Promise<string[]> {
  try {
    console.log("[TRENDS] Fetching from Google Trends RSS feed...");
    const res = await fetch("https://trends.google.com/trending/rss?geo=IN", {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const xml = await res.text();
      const titleMatches = xml.match(/<title>([^<]+)<\/title>/g) || [];
      const trends = titleMatches
        .slice(1, 6)
        .map((t) => t.replace(/<\/?title>/g, "").trim())
        .filter((t) => t.length > 0);

      if (trends.length > 0) {
        console.log("[TRENDS] ✅ RSS SUCCESS:", trends.length, "trends:", JSON.stringify(trends));
        return trends;
      }
    }
  } catch (e) {
    console.error("[TRENDS] RSS fetch failed:", e);
  }
  return [];
}

async function generateTrendsWithAI(): Promise<string[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    console.log("[TRENDS] 🟠 Generating trends with AI...");
    const res = await fetch(`${supabaseUrl}/functions/v1/ai`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a social media trend analyst. Generate 5 currently trending topics for social media posts relevant to India.
Return ONLY a JSON array of strings. No explanations, no markdown.
Example: ["AI in Healthcare","Remote Work Tips","Sustainable Fashion","Digital Nomad Life","Mental Health Awareness"]`,
          },
          {
            role: "user",
            content: `Generate 5 trending topics for social media posts right now in ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      console.log("[TRENDS] AI raw response:", raw);

      if (raw) {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const topics: string[] = JSON.parse(jsonMatch[0]);
          if (Array.isArray(topics) && topics.length > 0) {
            console.log("[TRENDS] ✅ AI SUCCESS:", topics.length, "trends:", JSON.stringify(topics));
            return topics;
          }
        }
      }
    } else {
      const err = await res.text();
      console.error("[TRENDS] ❌ AI error:", err.substring(0, 300));
    }
  } catch (e) {
    console.error("[TRENDS] ❌ AI request failed:", e);
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[TRENDS] 🔵 Starting generate-trends request");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try RSS first (fastest, no API calls needed)
    console.log("[TRENDS] 🔴 Skipping AI (Supabase AI endpoint not available), using RSS directly");
    let topics = await fetchTrendsFromRSS();
    let source = "RSS";

    if (topics.length === 0) {
      console.log("[TRENDS] ⚠️ RSS also failed, returning error");
      return new Response(JSON.stringify({ success: false, added: 0, message: "Failed to fetch trends from RSS" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[TRENDS] 📋 Extracted trends:", JSON.stringify(topics));
    console.log("[TRENDS] Source:", source);

    // Check for duplicates
    const { data: existing, error: selectError } = await supabase.from("trends").select("topic");
    if (selectError) {
      console.error("[TRENDS] ❌ Failed to fetch existing trends:", selectError);
      throw new Error(`Failed to check existing trends: ${selectError.message}`);
    }
    
    const existingTopics = new Set((existing || []).map((t: any) => t.topic.toLowerCase()));
    const newTopics = topics.filter((t) => !existingTopics.has(t.toLowerCase()));

    if (newTopics.length === 0) {
      console.log("[TRENDS] ℹ️ All topics already exist");
      return new Response(JSON.stringify({ success: true, added: 0, message: "All topics already exist" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert new trends
    const rows = newTopics.map((topic) => ({ topic, source, used: false }));
    console.log("[TRENDS] 💾 Inserting new trends:", JSON.stringify(rows));
    const { error } = await supabase.from("trends").insert(rows);
    if (error) {
      console.error("[TRENDS] ❌ DB insert failed:", error);
      throw new Error(`DB insert failed: ${error.message}`);
    }

    console.log(`[TRENDS] ✅ Successfully saved ${newTopics.length} trends (source: ${source}):`, JSON.stringify(newTopics));

    return new Response(JSON.stringify({ success: true, added: newTopics.length, topics: newTopics, source }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[TRENDS] ❌ generate-trends error:", e);
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
