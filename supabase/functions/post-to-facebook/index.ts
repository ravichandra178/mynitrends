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
    const { postId } = await req.json();
    if (!postId) throw new Error("Missing postId");

    const facebookPageId = Deno.env.get("FACEBOOK_PAGE_ID")!;
    const facebookAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;

    // Get post from Neon
    const client = await pool.connect();
    try {
      const postResult = await client.queryObject<any>(
        "SELECT * FROM posts WHERE id = $1",
        [postId]
      );
      const post = postResult.rows?.[0];
      if (!post) throw new Error("Post not found");
      if (post.posted) throw new Error("Already posted");

      const pageId = facebookPageId;
      const accessToken = facebookAccessToken;

      let fbPostId: string;

      if (post.image_url) {
        // Post with photo (note: image_url is base64 data URL from earlier generation)
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
        formData.append("access_token", accessToken);

        const fbRes = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
          method: "POST",
          body: formData,
        });

        const fbData = await fbRes.json();
        if (fbData.error) throw new Error(fbData.error.message);
        fbPostId = fbData.post_id || fbData.id;
      } else {
        // Text-only post
        const fbRes = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: post.content, access_token: accessToken }),
        });

        const fbData = await fbRes.json();
        if (fbData.error) throw new Error(fbData.error.message);
        fbPostId = fbData.id;
      }

      // Update post in Neon
      await client.queryObject(
        "UPDATE posts SET posted = true, facebook_post_id = $1 WHERE id = $2",
        [fbPostId, postId]
      );

      return new Response(JSON.stringify({ success: true, facebookPostId: fbPostId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      client.release();
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("post-to-facebook error:", e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
