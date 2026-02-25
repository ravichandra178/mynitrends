/// <reference lib="deno.window" />
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Get DATABASE_URL with proper formatting
function getDatabaseUrl(): string {
  let dbUrl = Deno.env.get("DATABASE_URL");
  
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set!");
  }

  // Parse URL to check if database name is present
  try {
    const url = new URL(dbUrl);
    console.log(`Parsed URL - hostname: ${url.hostname}, pathname: "${url.pathname}", search: "${url.search}"`);
    
    // If pathname is empty or just "/" then database name is missing
    if (!url.pathname || url.pathname === "/") {
      console.log("❌ Missing database name in URL - appending /postgres");
      
      // Rebuild URL with database name
      const baseUrl = `${url.protocol}//${url.username ? url.username + ':' + url.password + '@' : ''}${url.hostname}${url.port ? ':' + url.port : ''}/postgres`;
      dbUrl = baseUrl + url.search;
      
      console.log(`✅ Modified URL: ${baseUrl.substring(0, 60)}...`);
    } else {
      console.log(`✅ URL already has database: ${url.pathname}`);
    }
  } catch (e) {
    console.error("Failed to parse DATABASE_URL:", e);
    throw new Error(`Invalid DATABASE_URL format: ${e}`);
  }

  return dbUrl;
}

async function getConnection() {
  const dbUrl = getDatabaseUrl();
  console.log(`Final DB URL pathname check - has database: ${new URL(dbUrl).pathname}`);
  
  const client = new Client(dbUrl); // Pass URL string directly, not as property
  await client.connect();
  return client;
}


async function handleTrendsList(req: Request): Promise<Response> {
  try {
    const client = await getConnection();
    const result = await client.queryObject("SELECT * FROM trends ORDER BY created_at DESC");
    await client.end();
    
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
    await client.end();

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
    await client.end();
    
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
    await client.end();
    
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
    await client.end();
    
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
    await client.end();
    
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
    await client.end();
    
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

// Initialize database tables if they don't exist
async function initializeDatabaseSchema() {
  try {
    console.log("🔍 Initializing database schema...");
    const dbUrl = getDatabaseUrl();
    const client = new Client(dbUrl);
    await client.connect();
    
    try {
      // Create trends table
      await client.queryObject(`
        CREATE TABLE IF NOT EXISTS public.trends (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          topic TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual',
          used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
      `);
      console.log("✅ trends table ready");
    } catch (e) {
      console.log("⚠️ trends table:", e instanceof Error ? e.message : e);
    }
    
    try {
      // Create posts table
      await client.queryObject(`
        CREATE TABLE IF NOT EXISTS public.posts (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          scheduled_time TIMESTAMP WITH TIME ZONE,
          posted BOOLEAN NOT NULL DEFAULT false,
          facebook_post_id TEXT,
          engagement_likes INTEGER DEFAULT 0,
          engagement_comments INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
      `);
      console.log("✅ posts table ready");
    } catch (e) {
      console.log("⚠️ posts table:", e instanceof Error ? e.message : e);
    }
    
    try {
      // Create settings table
      await client.queryObject(`
        CREATE TABLE IF NOT EXISTS public.settings (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          openai_api_key TEXT DEFAULT '',
          facebook_page_id TEXT DEFAULT '',
          facebook_page_access_token TEXT DEFAULT '',
          auto_post_enabled BOOLEAN NOT NULL DEFAULT false,
          max_posts_per_day INTEGER NOT NULL DEFAULT 3,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        )
      `);
      console.log("✅ settings table ready");
    } catch (e) {
      console.log("⚠️ settings table:", e instanceof Error ? e.message : e);
    }
    
    try {
      // Insert default settings row if none exists
      await client.queryObject(`
        INSERT INTO public.settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING
      `);
      console.log("✅ Default settings row ensured");
    } catch (e) {
      console.log("⚠️ Default settings:", e instanceof Error ? e.message : e);
    }
    
    try {
      // Enable RLS
      await client.queryObject(`ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY`);
      await client.queryObject(`ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY`);
      await client.queryObject(`ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY`);
      console.log("✅ RLS enabled");
    } catch (e) {
      console.log("⚠️ RLS:", e instanceof Error ? e.message : e);
    }
    
    try {
      // Create policies
      await client.queryObject(`DROP POLICY IF EXISTS "Allow all on trends" ON public.trends`);
      await client.queryObject(`DROP POLICY IF EXISTS "Allow all on posts" ON public.posts`);
      await client.queryObject(`DROP POLICY IF EXISTS "Allow all on settings" ON public.settings`);
      
      await client.queryObject(`CREATE POLICY "Allow all on trends" ON public.trends FOR ALL USING (true) WITH CHECK (true)`);
      await client.queryObject(`CREATE POLICY "Allow all on posts" ON public.posts FOR ALL USING (true) WITH CHECK (true)`);
      await client.queryObject(`CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true)`);
      console.log("✅ Policies created");
    } catch (e) {
      console.log("⚠️ Policies:", e instanceof Error ? e.message : e);
    }
    
    // Get list of tables
    const result = await client.queryObject(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    
    console.log("✅ Database schema initialized!");
    console.log("📋 Available tables:", result.rows.map((row: any) => row.table_name).join(", "));
    
    await client.end();
  } catch (error) {
    console.error("❌ Database initialization error:", error);
  }
}

// Initialize database on startup
await initializeDatabaseSchema();

Deno.serve(async (req) => {
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
