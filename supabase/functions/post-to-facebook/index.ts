import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { postId } = await req.json();
    if (!postId) throw new Error("Missing postId");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const facebookPageId = Deno.env.get("FACEBOOK_PAGE_ID")!;
    const facebookAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;

    // Get post
    const { data: post, error: postError } = await supabase.from("posts").select("*").eq("id", postId).single();
    if (postError || !post) throw new Error("Post not found");
    if (post.posted) throw new Error("Already posted");

    const pageId = facebookPageId;
    const accessToken = facebookAccessToken;

    let fbPostId: string;

    if (post.image_url) {
      // Post with photo
      const formData = new FormData();
      
      // Download image and upload as file
      const imgRes = await fetch(post.image_url);
      const imgBlob = await imgRes.blob();
      formData.append("source", imgBlob, "image.png");
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

    // Update post
    await supabase.from("posts").update({
      posted: true,
      facebook_post_id: fbPostId,
    }).eq("id", postId);

    return new Response(JSON.stringify({ success: true, facebookPostId: fbPostId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("post-to-facebook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
