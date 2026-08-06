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
      // Get settings for page ID and access token
      const settingsResult = await client.queryObject<any>(
        "SELECT facebook_page_id, facebook_app_id, facebook_page_access_token FROM settings LIMIT 1"
      );
      const settings = settingsResult.rows?.[0];
      const accessToken = settings?.facebook_page_access_token;
      const pageId = settings?.facebook_page_id || settings?.facebook_app_id;

      if (!accessToken) throw new Error("Facebook access token not configured");
      if (!pageId) throw new Error("Facebook page ID not configured");

      const pagePostsRes = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=100&access_token=${encodeURIComponent(accessToken)}`
      );
      const pagePostsData = await pagePostsRes.json();
      if (pagePostsData.error) throw new Error(pagePostsData.error.message);

      const matchedPost = Array.isArray(pagePostsData.data)
        ? pagePostsData.data.find((post: any) => post.id === facebookPostId)
        : null;

      let likes = matchedPost?.likes?.summary?.total_count ?? 0;
      let comments = matchedPost?.comments?.summary?.total_count ?? 0;

      if (!matchedPost) {
        const directRes = await fetch(
          `https://graph.facebook.com/v25.0/${facebookPostId}?fields=id,likes.summary(true),comments.summary(true)&access_token=${encodeURIComponent(accessToken)}`
        );
        const directData = await directRes.json();
        if (directData.error) throw new Error(directData.error.message);

        likes = directData.likes?.summary?.total_count ?? 0;
        comments = directData.comments?.summary?.total_count ?? 0;
      }

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
