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
    const { postId, facebookPostId } = await req.json();
    if (!postId || !facebookPostId) throw new Error("Missing postId or facebookPostId");

    const client = await pool.connect();
    try {
      // Get settings for access token
      const settingsResult = await client.queryObject<any>(
        "SELECT facebook_page_access_token FROM settings LIMIT 1"
      );
      const settings = settingsResult.rows?.[0];
      if (!settings?.facebook_page_access_token) throw new Error("Facebook access token not configured");

      const fbRes = await fetch(
        `https://graph.facebook.com/${facebookPostId}?fields=likes.summary(true),comments.summary(true)&access_token=${settings.facebook_page_access_token}`
      );
      const fbData = await fbRes.json();
      if (fbData.error) throw new Error(fbData.error.message);

      const likes = fbData.likes?.summary?.total_count ?? 0;
      const comments = fbData.comments?.summary?.total_count ?? 0;

      await client.queryObject(
        "UPDATE posts SET engagement_likes = $1, engagement_comments = $2 WHERE id = $3",
        [likes, comments, postId]
      );

      return new Response(JSON.stringify({ success: true, likes, comments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("fetch-engagement error:", e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
