import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const pool = new Pool(Deno.env.get("DATABASE_URL")!, { max: 3 });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trendId, topic } = await req.json();
    if (!trendId || !topic) throw new Error("Missing trendId or topic");

    const groqApiKey = Deno.env.get("GROQ_API_KEY")!;
    const huggingFaceApiKey = Deno.env.get("HUGGINGFACE_API_KEY")!;

    // Step 1: Generate post content via AI
    const contentRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
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

    // Step 2: Generate image via Hugging Face (optional - store as URL string if successful)
    let imageUrl: string | null = null;
    try {
      const imagePrompt = `Facebook post image about ${topic}. Social media style, vibrant colors, modern design, engaging visual. Text: "${postContent.split("\n")[0]}"`;
      
      const imageRes = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingFaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imagePrompt,
          parameters: {
            negative_prompt: "low quality, blurry, distorted",
            height: 1080,
            width: 1080,
            guidance_scale: 7.5,
            num_inference_steps: 30,
          },
        }),
      });

      if (imageRes.ok) {
        const imageBlob = await imageRes.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        imageUrl = `data:image/png;base64,${base64}`;
        console.log("Image generated successfully");
      } else {
        const err = await imageRes.text();
        console.error("Image generation error:", err);
      }
    } catch (imgError) {
      console.error("Image generation failed:", imgError);
      // Continue without image if generation fails
    }

    // Step 3: Insert post into Neon database
    const client = await pool.connect();
    try {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
      
      const result = await client.queryObject(
        `INSERT INTO posts (trend_id, content, image_url, scheduled_time, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [trendId, postContent, imageUrl, scheduledTime]
      );

      // Step 4: Mark trend as used
      await client.queryObject(
        "UPDATE trends SET used = true WHERE id = $1",
        [trendId]
      );
    } finally {
      client.release();
    }

    return new Response(JSON.stringify({ success: true, content: postContent, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("generate-post error:", e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
