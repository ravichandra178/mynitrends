import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.168.0/http/file_server.ts";
import { extname } from "https://deno.land/std@0.168.0/path/mod.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8080");

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Not implemented" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serve static files from dist directory
  try {
    const response = await serveDir(req, {
      fsRoot: "./dist",
      showDirListing: false,
    });

    // If it's a 404, serve index.html for SPA routing
    if (response.status === 404) {
      const indexPath = "./dist/index.html";
      try {
        const indexContent = await Deno.readFile(indexPath);
        return new Response(indexContent, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }

    // Set proper MIME types for JavaScript/CSS
    const ext = extname(pathname);
    if (ext === ".js" || ext === ".mjs") {
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          "Content-Type": "application/javascript; charset=utf-8",
        },
      });
    }

    if (ext === ".css") {
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          "Content-Type": "text/css; charset=utf-8",
        },
      });
    }

    return response;
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}

console.log(`🚀 Server running at http://localhost:${PORT}`);
console.log(`📁 Serving from ./dist directory`);

serve(handler, { port: PORT });
