/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Initialize database pool
let dbUrl = Deno.env.get("DATABASE_URL");
console.log(`Initializing database with URL: ${dbUrl ? "***" : "NOT SET"}`);

if (!dbUrl) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

// Parse URL to check if database name is present
try {
  const url = new URL(dbUrl);
  // If pathname is empty or just "/" then database name is missing
  if (!url.pathname || url.pathname === "/") {
    // Add /postgres as database name
    const newUrl = dbUrl.includes("?") 
      ? dbUrl.replace("?", "/postgres?") 
      : dbUrl + "/postgres";
    dbUrl = newUrl;
    console.log("✅ Added /postgres to DATABASE_URL");
  }
} catch (e) {
  console.error("Failed to parse DATABASE_URL:", e);
  throw new Error(`Invalid DATABASE_URL format: ${e}`);
}

const pool = new Pool(dbUrl, {
  max: 3,
});

async function getConnection() {
  return pool.connect();
}


async function handleTrendsList(req: Request): Promise<Response> {
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
  const method = req.method;

  console.log(`[${new Date().toISOString()}] ${method} ${path}`);

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (path === "/health") {
    const dbUrl = Deno.env.get("DATABASE_URL");
    return new Response(JSON.stringify({
      status: "ok",
      database: dbUrl ? "configured" : "not configured",
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Debug endpoint to test routing
  if (path === "/debug") {
    return new Response(JSON.stringify({
      path,
      method,
      dbUrl: Deno.env.get("DATABASE_URL") ? "SET" : "NOT SET",
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // API Routes - handle these FIRST before static files
  try {
    // Debug logging
    if (path.startsWith("/api/")) {
      console.log(`API route check: path="${path}", method="${method}"`);
    }
    
    if (path === "/api/trends" && method === "GET") {
      console.log("Matched GET /api/trends");
      return await handleTrendsList(req);
    }
    if (path === "/api/trends" && method === "POST") {
      console.log("Matched POST /api/trends");
      return await handleTrendsCreate(req);
    }
    if (path === "/api/posts" && method === "GET") return await handlePostsList(req);
    if (path.startsWith("/api/posts/") && method === "DELETE") {
      const postId = path.split("/")[3];
      return await handlePostDelete(req, postId);
    }
    if (path.startsWith("/api/posts/") && method === "PATCH") {
      const postId = path.split("/")[3];
      return await handlePostUpdate(req, postId);
    }
    if (path === "/api/settings" && method === "GET") return await handleSettingsGet(req);
    if (path === "/api/settings" && method === "PATCH") return await handleSettingsUpdate(req);
    if (path === "/api/generate-post" && method === "POST") return await handleGeneratePost(req);
    if (path === "/api/generate-trends" && method === "POST") return await handleGenerateTrends(req);
    if (path === "/api/post-to-facebook" && method === "POST") return await handlePostToFacebook(req);
    if (path === "/api/fetch-engagement" && method === "POST") return await handleFetchEngagement(req);
    if (path === "/api/test-connection" && method === "POST") return await handleTestConnection(req);
  } catch (e) {
    console.error(`Error handling ${method} ${path}:`, e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Serve static files for SPA
  if (path === "/" || path === "/index.html") {
    const staticPath = "./dist/index.html";
    try {
      const content = await Deno.readFile(staticPath);
      return new Response(content, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    } catch (e) {
      console.error(`Error serving index.html:`, e);
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }
  }

  // Serve other static files (but not /api/ paths)
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
    } catch (e) {
      console.log(`Static file not found: ${staticPath}, falling back to SPA`);
      // Fall back to SPA index.html for client-side routing
      try {
        const content = await Deno.readFile("./dist/index.html");
        return new Response(content, {
          headers: { "Content-Type": "text/html", ...corsHeaders },
        });
      } catch (err) {
        console.error(`Error serving SPA fallback:`, err);
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
    }
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
