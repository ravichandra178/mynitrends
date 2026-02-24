import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trendId, topic } = await req.json();
    if (!trendId || !topic) throw new Error("Missing trendId or topic");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Generate post content via AI
    const contentRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a social media copywriter. Generate a Facebook post about the given topic.
Rules:
- Exactly 3 lines
- Line 1: Hook (attention-grabbing)
- Line 2: Insight (value/fact)
- Line 3: Question (engagement driver)
- Max 25 words total
- Then add exactly 5 relevant hashtags on a new line
- Return ONLY the post text and hashtags, nothing else.`,
          },
          { role: "user", content: `Topic: ${topic}` },
        ],
      }),
    });

    if (!contentRes.ok) {
      const err = await contentRes.text();
      console.error("AI content error:", err);
      throw new Error("Failed to generate content");
    }
    const contentData = await contentRes.json();
    const postContent = contentData.choices?.[0]?.message?.content?.trim();
    if (!postContent) throw new Error("Empty content from AI");

    // Step 2: Generate image via AI
    const imageRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Create a 1080x1080 social media post image. Dark background, minimal design. Bold centered white text headline: "${postContent.split("\n")[0]}". Clean, professional, modern. No cluttered elements.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    let imageUrl = null;
    if (imageRes.ok) {
      const imageData = await imageRes.json();
      const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (base64Image) {
        // Upload to storage
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const fileName = `post-${trendId}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageBytes, { contentType: "image/png" });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        } else {
          console.error("Upload error:", uploadError);
        }
      }
    } else {
      console.error("Image generation failed:", await imageRes.text());
    }

    // Step 3: Insert post
    const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    const { error: insertError } = await supabase.from("posts").insert({
      trend_id: trendId,
      content: postContent,
      image_url: imageUrl,
      scheduled_time: scheduledTime,
    });
    if (insertError) throw insertError;

    // Step 4: Mark trend as used
    await supabase.from("trends").update({ used: true }).eq("id", trendId);

    return new Response(JSON.stringify({ success: true, content: postContent, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
