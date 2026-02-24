import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use AI to generate current trending topics
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a social media trend analyst. Generate 5 currently trending topics that would perform well on Facebook.
Rules:
- Return ONLY a JSON array of strings
- Each topic should be 2-5 words
- Topics should be diverse (tech, lifestyle, business, culture, health)
- Focus on topics trending RIGHT NOW in ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
- No explanations, just the JSON array
Example: ["AI in Healthcare","Remote Work Tips","Sustainable Fashion","Digital Nomad Life","Mental Health Awareness"]`,
          },
          { role: "user", content: "Generate 5 trending topics for Facebook posts right now." },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("AI error:", err);
      throw new Error("Failed to generate trends");
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty AI response");

    // Parse JSON array from response (handle markdown code blocks)
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const topics: string[] = JSON.parse(cleaned);

    if (!Array.isArray(topics) || topics.length === 0) throw new Error("Invalid topics format");

    // Check for duplicates
    const { data: existing } = await supabase.from("trends").select("topic");
    const existingTopics = new Set((existing ?? []).map((t: any) => t.topic.toLowerCase()));

    const newTopics = topics.filter((t) => !existingTopics.has(t.toLowerCase()));

    if (newTopics.length === 0) {
      return new Response(JSON.stringify({ success: true, added: 0, message: "All topics already exist" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase
      .from("trends")
      .insert(newTopics.map((topic) => ({ topic, source: "auto" })));

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, added: newTopics.length, topics: newTopics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
