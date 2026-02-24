import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get settings
    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    if (!settings?.auto_post_enabled) {
      return new Response(JSON.stringify({ message: "Auto post disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!settings.facebook_page_id || !settings.facebook_page_access_token) {
      return new Response(JSON.stringify({ message: "Facebook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check posts today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: postsToday } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("posted", true)
      .gte("created_at", todayStart.toISOString());

    if ((postsToday ?? 0) >= settings.max_posts_per_day) {
      return new Response(JSON.stringify({ message: "Daily limit reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find due posts
    const now = new Date().toISOString();
    const { data: duePosts } = await supabase
      .from("posts")
      .select("*")
      .eq("posted", false)
      .lte("scheduled_time", now)
      .order("scheduled_time", { ascending: true })
      .limit(settings.max_posts_per_day - (postsToday ?? 0));

    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts due" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const post of duePosts) {
      try {
        let fbPostId: string;

        if (post.image_url) {
          const formData = new FormData();
          const imgRes = await fetch(post.image_url);
          const imgBlob = await imgRes.blob();
          formData.append("source", imgBlob, "image.png");
          formData.append("caption", post.content);
          formData.append("access_token", settings.facebook_page_access_token);

          const fbRes = await fetch(`https://graph.facebook.com/${settings.facebook_page_id}/photos`, {
            method: "POST",
            body: formData,
          });
          const fbData = await fbRes.json();
          if (fbData.error) throw new Error(fbData.error.message);
          fbPostId = fbData.post_id || fbData.id;
        } else {
          const fbRes = await fetch(`https://graph.facebook.com/${settings.facebook_page_id}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.content, access_token: settings.facebook_page_access_token }),
          });
          const fbData = await fbRes.json();
          if (fbData.error) throw new Error(fbData.error.message);
          fbPostId = fbData.id;
        }

        await supabase.from("posts").update({ posted: true, facebook_post_id: fbPostId }).eq("id", post.id);

        // Fetch engagement
        const engRes = await fetch(
          `https://graph.facebook.com/${fbPostId}?fields=likes.summary(true),comments.summary(true)&access_token=${settings.facebook_page_access_token}`
        );
        const engData = await engRes.json();
        if (!engData.error) {
          await supabase.from("posts").update({
            engagement_likes: engData.likes?.summary?.total_count ?? 0,
            engagement_comments: engData.comments?.summary?.total_count ?? 0,
          }).eq("id", post.id);
        }

        results.push({ postId: post.id, status: "published", fbPostId });
      } catch (err) {
        results.push({ postId: post.id, status: "failed", error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
