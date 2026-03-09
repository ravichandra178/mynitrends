import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    let pageId, accessToken;
    try {
      const body = await req.json();
      pageId = body.pageId;
      accessToken = body.accessToken;
    } catch (_) {
      // If body is not JSON or empty, ignore
    }

    // Fallback to env vars if not provided in body
    if (!pageId) {
      pageId = Deno.env.get("FACEBOOK_APP_ID");
    }
    if (!accessToken) {
      accessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
    }

    if (!pageId || !accessToken) throw new Error("Missing pageId or accessToken");

    let fbUrl;
    if (pageId) {
      // If pageId is provided, test the page connection
      fbUrl = `https://graph.facebook.com/${pageId}?fields=name,id&access_token=${accessToken}`;
    } else {
      // Otherwise, test the user token
      fbUrl = `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${accessToken}`;
    }
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) {
      return new Response(JSON.stringify({ success: false, error: fbData.error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, name: fbData.name, id: fbData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("test-connection error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
