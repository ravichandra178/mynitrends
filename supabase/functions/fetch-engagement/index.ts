import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postId, facebookPostId } = await req.json();
    if (!postId || !facebookPostId) throw new Error("Missing postId or facebookPostId");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get settings for access token
    const { data: settings } = await supabase.from("settings").select("facebook_page_access_token").limit(1).single();
    if (!settings?.facebook_page_access_token) throw new Error("Facebook access token not configured");

    const fbRes = await fetch(
      `https://graph.facebook.com/${facebookPostId}?fields=likes.summary(true),comments.summary(true)&access_token=${settings.facebook_page_access_token}`
    );
    const fbData = await fbRes.json();
    if (fbData.error) throw new Error(fbData.error.message);

    const likes = fbData.likes?.summary?.total_count ?? 0;
    const comments = fbData.comments?.summary?.total_count ?? 0;

    await supabase.from("posts").update({
      engagement_likes: likes,
      engagement_comments: comments,
    }).eq("id", postId);

    return new Response(JSON.stringify({ success: true, likes, comments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-engagement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
