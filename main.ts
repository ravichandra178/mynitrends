/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Initialize database pool
const pool = new Pool(Deno.env.get("DATABASE_URL")!, {
  max: 3,
});

async function getConnection() {
  return pool.connect();
}

async function handleTrendsList(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  
  try {
    const client = await getConnection();
    const result = await client.queryObject("SELECT * FROM trends ORDER BY created_at DESC");
    client.release();
    
    return new Response(JSON.stringify(result.rows), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleTrendsCreate(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const { topic } = await req.json();
    if (!topic) return new Response(JSON.stringify({ error: "Missing topic" }), { status: 400, headers: corsHeaders });

    const client = await getConnection();
    const result = await client.queryObject(
      "INSERT INTO trends (topic, source, used, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [topic, "manual", false]
    );
    client.release();

    return new Response(JSON.stringify(result.rows[0]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (e) {
    console.error("POST /api/trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handlePostsList(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  
  try {
    const client = await getConnection();
    const result = await client.queryObject("SELECT * FROM posts ORDER BY created_at DESC");
    client.release();
    
    return new Response(JSON.stringify(result.rows), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handlePostDelete(req: Request, postId: string): Promise<Response> {
  if (req.method !== "DELETE") return new Response("Method not allowed", { status: 405 });
  
  try {
    const client = await getConnection();
    await client.queryObject("DELETE FROM posts WHERE id = $1", [postId]);
    client.release();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("DELETE /api/posts/{id} error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handlePostUpdate(req: Request, postId: string): Promise<Response> {
  if (req.method !== "PATCH") return new Response("Method not allowed", { status: 405 });
  
  try {
    const body = await req.json();
    const { content, scheduled_time } = body;
    
    const client = await getConnection();
    let query = "UPDATE posts SET ";
    const values: any[] = [];
    let paramCount = 1;
    
    if (content !== undefined) {
      query += `content = $${paramCount}`;
      values.push(content);
      paramCount++;
    }
    
    if (scheduled_time !== undefined) {
      if (content !== undefined) query += ", ";
      query += `scheduled_time = $${paramCount}`;
      values.push(scheduled_time);
      paramCount++;
    }
    
    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(postId);
    
    const result = await client.queryObject(query, values);
    client.release();
    
    return new Response(JSON.stringify(result.rows[0]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("PATCH /api/posts/{id} error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleSettingsGet(req: Request): Promise<Response> {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  
  try {
    const client = await getConnection();
    const result = await client.queryObject("SELECT * FROM settings LIMIT 1");
    client.release();
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({}), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(result.rows[0]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/settings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleSettingsUpdate(req: Request): Promise<Response> {
  if (req.method !== "PATCH") return new Response("Method not allowed", { status: 405 });
  
  try {
    const body = await req.json();
    const client = await getConnection();
    
    // Ensure settings row exists
    await client.queryObject("INSERT INTO settings DEFAULT VALUES ON CONFLICT DO NOTHING");
    
    // Build update query
    let query = "UPDATE settings SET ";
    const values: any[] = [];
    let paramCount = 1;
    
    const keys = Object.keys(body);
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) query += ", ";
      query += `${keys[i]} = $${paramCount}`;
      values.push(body[keys[i]]);
      paramCount++;
    }
    
    query += " RETURNING *";
    
    const result = await client.queryObject(query, values);
    client.release();
    
    return new Response(JSON.stringify(result.rows[0]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("PATCH /api/settings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleGeneratePost(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const { trendId, topic } = await req.json();
    if (!trendId || !topic) {
      return new Response(JSON.stringify({ error: "Missing trendId or topic" }), { status: 400, headers: corsHeaders });
    }

    // Call the actual generate-post function from Deno Deploy
    const deploymentUrl = Deno.env.get("DENO_DEPLOYMENT_ID") 
      ? `https://${Deno.env.get("DENO_DEPLOYMENT_ID")}.deno.dev`
      : "http://localhost:8000";
    
    const funcRes = await fetch(`${deploymentUrl}/functions/v1/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trendId, topic }),
    });

    if (!funcRes.ok) throw new Error("Failed to generate post");
    const data = await funcRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (e) {
    console.error("POST /api/generate-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleGenerateTrends(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const deploymentUrl = Deno.env.get("DENO_DEPLOYMENT_ID") 
      ? `https://${Deno.env.get("DENO_DEPLOYMENT_ID")}.deno.dev`
      : "http://localhost:8000";
    
    const funcRes = await fetch(`${deploymentUrl}/functions/v1/generate-trends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!funcRes.ok) throw new Error("Failed to generate trends");
    const data = await funcRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/generate-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handlePostToFacebook(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing postId" }), { status: 400, headers: corsHeaders });
    }

    const deploymentUrl = Deno.env.get("DENO_DEPLOYMENT_ID") 
      ? `https://${Deno.env.get("DENO_DEPLOYMENT_ID")}.deno.dev`
      : "http://localhost:8000";
    
    const funcRes = await fetch(`${deploymentUrl}/functions/v1/post-to-facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (!funcRes.ok) throw new Error("Failed to post to Facebook");
    const data = await funcRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/post-to-facebook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleFetchEngagement(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const { postId, facebookPostId } = await req.json();
    if (!postId || !facebookPostId) {
      return new Response(JSON.stringify({ error: "Missing postId or facebookPostId" }), { status: 400, headers: corsHeaders });
    }

    const deploymentUrl = Deno.env.get("DENO_DEPLOYMENT_ID") 
      ? `https://${Deno.env.get("DENO_DEPLOYMENT_ID")}.deno.dev`
      : "http://localhost:8000";
    
    const funcRes = await fetch(`${deploymentUrl}/functions/v1/fetch-engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, facebookPostId }),
    });

    if (!funcRes.ok) throw new Error("Failed to fetch engagement");
    const data = await funcRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/fetch-engagement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

async function handleTestConnection(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  
  try {
    const { pageId, accessToken } = await req.json();
    if (!pageId || !accessToken) {
      return new Response(JSON.stringify({ error: "Missing pageId or accessToken" }), { status: 400, headers: corsHeaders });
    }

    const deploymentUrl = Deno.env.get("DENO_DEPLOYMENT_ID") 
      ? `https://${Deno.env.get("DENO_DEPLOYMENT_ID")}.deno.dev`
      : "http://localhost:8000";
    
    const funcRes = await fetch(`${deploymentUrl}/functions/v1/test-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, accessToken }),
    });

    if (!funcRes.ok) throw new Error("Failed to test connection");
    const data = await funcRes.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/test-connection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Route to appropriate handler
  if (path === "/api/trends" && req.method === "GET") return handleTrendsList(req);
  if (path === "/api/trends" && req.method === "POST") return handleTrendsCreate(req);
  if (path === "/api/posts" && req.method === "GET") return handlePostsList(req);
  if (path.startsWith("/api/posts/") && req.method === "DELETE") {
    const postId = path.split("/")[3];
    return handlePostDelete(req, postId);
  }
  if (path.startsWith("/api/posts/") && req.method === "PATCH") {
    const postId = path.split("/")[3];
    return handlePostUpdate(req, postId);
  }
  if (path === "/api/settings" && req.method === "GET") return handleSettingsGet(req);
  if (path === "/api/settings" && req.method === "PATCH") return handleSettingsUpdate(req);
  if (path === "/api/generate-post") return handleGeneratePost(req);
  if (path === "/api/generate-trends") return handleGenerateTrends(req);
  if (path === "/api/post-to-facebook") return handlePostToFacebook(req);
  if (path === "/api/fetch-engagement") return handleFetchEngagement(req);
  if (path === "/api/test-connection") return handleTestConnection(req);

  // Serve static files for SPA
  if (path === "/" || path === "/index.html") {
    const staticPath = "./dist/index.html";
    try {
      const content = await Deno.readFile(staticPath);
      return new Response(content, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    } catch {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
  }

  // Serve other static files
  if (!path.startsWith("/api/")) {
    const staticPath = `./dist${path}`;
    try {
      const content = await Deno.readFile(staticPath);
      const ext = path.split(".").pop();
      const contentTypes: Record<string, string> = {
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        svg: "image/svg+xml",
      };
      const contentType = contentTypes[ext || ""] || "application/octet-stream";
      return new Response(content, {
        headers: { "Content-Type": contentType, ...corsHeaders },
      });
    } catch {
      // Fall back to SPA index.html for client-side routing
      try {
        const content = await Deno.readFile("./dist/index.html");
        return new Response(content, {
          headers: { "Content-Type": "text/html", ...corsHeaders },
        });
      } catch {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
    }
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
