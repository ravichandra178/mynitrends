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
    const facebookPageId = Deno.env.get("FACEBOOK_PAGE_ID")!;
    const facebookAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;
    const autoPostEnabled = Deno.env.get("AUTO_POST_ENABLED") === "true";
    const maxPostsPerDay = parseInt(Deno.env.get("MAX_POSTS_PER_DAY") || "3");

    if (!autoPostEnabled) {
      return new Response(JSON.stringify({ message: "Auto post disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!facebookPageId || !facebookAccessToken) {
      return new Response(JSON.stringify({ message: "Facebook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = await pool.connect();
    try {
      // Check posts today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const postsCount = await client.queryObject<{ count: number }>(
        "SELECT COUNT(*) as count FROM posts WHERE posted = true AND created_at >= $1",
        [todayStart.toISOString()]
      );
      const postsToday = (postsCount.rows?.[0]?.count ?? 0) as number;

      if (postsToday >= maxPostsPerDay) {
        return new Response(JSON.stringify({ message: "Daily limit reached" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find due posts
      const now = new Date().toISOString();
      const duePostsResult = await client.queryObject<any>(
        `SELECT * FROM posts WHERE posted = false AND scheduled_time <= $1 
         ORDER BY scheduled_time ASC LIMIT $2`,
        [now, maxPostsPerDay - postsToday]
      );
      const duePosts = duePostsResult.rows ?? [];

      if (duePosts.length === 0) {
        return new Response(JSON.stringify({ message: "No posts due" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const post of duePosts) {
        try {
          let fbPostId: string;

          if (post.image_url) {
            let imageBlob: Blob;
            
            if (post.image_url.startsWith("data:")) {
              // It's a data URL, convert to blob
              const parts = post.image_url.split(",");
              const bstr = atob(parts[1]);
              const n = bstr.length;
              const u8arr = new Uint8Array(n);
              for (let i = 0; i < n; i++) {
                u8arr[i] = bstr.charCodeAt(i);
              }
              imageBlob = new Blob([u8arr], { type: "image/png" });
            } else {
              // It's a URL, download it
              const imgRes = await fetch(post.image_url);
              imageBlob = await imgRes.blob();
            }

            const formData = new FormData();
            formData.append("source", imageBlob, "image.png");
            formData.append("caption", post.content);
            formData.append("access_token", facebookAccessToken);

            const fbRes = await fetch(`https://graph.facebook.com/${facebookPageId}/photos`, {
              method: "POST",
              body: formData,
            });
            const fbData = await fbRes.json();
            if (fbData.error) throw new Error(fbData.error.message);
            fbPostId = fbData.post_id || fbData.id;
          } else {
            const fbRes = await fetch(`https://graph.facebook.com/${facebookPageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: post.content, access_token: facebookAccessToken }),
            });
            const fbData = await fbRes.json();
            if (fbData.error) throw new Error(fbData.error.message);
            fbPostId = fbData.id;
          }

          await client.queryObject(
            "UPDATE posts SET posted = true, facebook_post_id = $1 WHERE id = $2",
            [fbPostId, post.id]
          );

          // Fetch engagement
          const engRes = await fetch(
            `https://graph.facebook.com/${fbPostId}?fields=likes.summary(true),comments.summary(true)&access_token=${facebookAccessToken}`
          );
          const engData = await engRes.json();
          if (!engData.error) {
            await client.queryObject(
              "UPDATE posts SET engagement_likes = $1, engagement_comments = $2 WHERE id = $3",
              [engData.likes?.summary?.total_count ?? 0, engData.comments?.summary?.total_count ?? 0, post.id]
            );
          }

          results.push({ postId: post.id, status: "published", fbPostId });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.push({ postId: post.id, status: "failed", error: errMsg });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("auto-post error:", e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
