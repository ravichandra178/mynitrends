import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getReplyTargetId } from "../../../src/lib/facebook-thread-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Settings error:", settingsError);
      throw new Error("Failed to fetch settings");
    }

    const pageId = settings?.facebook_page_id || Deno.env.get("VITE_FACEBOOK_PAGE_ID");
    const accessToken = settings?.facebook_page_access_token || Deno.env.get("VITE_FACEBOOK_PAGE_ACCESS_TOKEN");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!pageId || !accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing Facebook credentials" 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!groqApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "GROQ_API_KEY not configured" 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("[AI-REPLY] Starting AI reply check...");

    const postLimit = Number(Deno.env.get("POST_LIMIT") || "3");
    const replyLimit = Number(Deno.env.get("REPLY_THREAD_LIMIT") || "10");

    // Fetch recent posts from Facebook
    const postsUrl = `https://graph.facebook.com/v20.0/${pageId}/posts?fields=id,message,created_time&limit=${postLimit}&access_token=${encodeURIComponent(accessToken)}`;
    const postsRes = await fetch(postsUrl);
    const postsData = await postsRes.json();

    if (!postsRes.ok || postsData.error) {
      const msg = postsData.error?.message || "Failed to fetch posts";
      console.error("[AI-REPLY] Error fetching posts:", msg);
      return new Response(JSON.stringify({ success: false, error: msg }), { 
        status: 502, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const posts = postsData.data || [];
    let targetComment: any = null;

    // Find the newest unreplied comment across all posts
    for (const post of posts) {
      const commentsUrl = `https://graph.facebook.com/v20.0/${post.id}/comments?fields=id,message,from,created_time,parent{id},replies.limit(${replyLimit}){id,message,from,created_time,parent{id}}&access_token=${encodeURIComponent(accessToken)}`;
      const commentsRes = await fetch(commentsUrl);
      const commentsData = await commentsRes.json();

      if (!commentsRes.ok || !commentsData.data) continue;

      const allComments: any[] = [];
      for (const c of commentsData.data) {
        allComments.push(c);
        if (c.replies?.data) allComments.push(...c.replies.data);
      }

      const newestUnreplied = allComments
        .filter(c => c.from?.id !== pageId)
        .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime())[0];

      if (newestUnreplied) {
        targetComment = newestUnreplied;
        break;
      }
    }

    if (!targetComment) {
      console.log("[AI-REPLY] No new eligible comments found.");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No new comments" 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[AI-REPLY] Found comment from ${targetComment.from?.name || "User"}: "${targetComment.message.substring(0, 80)}..."`);

    // Generate autoreply using GROQ
    const groqModel = Deno.env.get("GROQ_MODEL") || Deno.env.get("GROK_MODEL") || "llama-3.1-8b-instant";
    
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: "system",
            content: Deno.env.get("SYSTEM_PROMPT") || `You are a helpful social media community manager. Generate thoughtful, engaging autoreply responses to comments.
Rules:
- Keep replies under 150 characters
- Be friendly and professional
- Answer questions if asked
- Thank users for engagement
- Maintain brand voice
- Avoid overly promotional content`
          },
          {
            role: "user",
            content: `Generate an autoreply response to this comment: "${targetComment.message}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!groqRes.ok) {
      const error = await groqRes.text();
      throw new Error(`GROQ API error: ${error}`);
    }

    const groqData = await groqRes.json();
    const replyText = groqData.choices?.[0]?.message?.content || "Thank you for your comment!";

    // Like the comment
    await fetch(`https://graph.facebook.com/v20.0/${targetComment.id}/likes?access_token=${encodeURIComponent(accessToken)}`, { 
      method: "POST" 
    });

    const replyTargetId = getReplyTargetId(targetComment.parent) || targetComment.id;
    const replyUrl = `https://graph.facebook.com/v20.0/${replyTargetId}/comments?access_token=${encodeURIComponent(accessToken)}`;

    const replyRes = await fetch(replyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyText }),
    });

    const replyData = await replyRes.json();

    if (!replyRes.ok || replyData.error) {
      console.error("[AI-REPLY] Reply failed:", replyData.error?.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: replyData.error?.message 
      }), { 
        status: 502, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[AI-REPLY] Successfully replied: "${replyText}"`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "AI replied successfully",
      reply: replyText,
      commentId: targetComment.id
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[AI-REPLY] Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});