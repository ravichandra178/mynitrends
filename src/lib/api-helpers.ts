// API Helper Functions - Direct calls to Deno backend
// Single source of truth: Prisma PostgreSQL Database

const API_BASE = '';  // Relative URL (same origin)

// ====================================
// TRENDS API
// ====================================

export async function fetchTrends() {
  console.log("%c[TRENDS LOG] 📊 Fetching trends from /api/trends...", "color: blue; font-weight: bold;");
  try {
    const response = await fetch(`${API_BASE}/api/trends`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    
    console.log(`%c[TRENDS LOG] ✅ Fetched ${data?.length || 0} trends from database:`, "color: green; font-weight: bold;");
    
    if (data && data.length > 0) {
      data.forEach((trend: any, index: number) => {
        const sourceEmoji = trend.source === "groq" || trend.source === "hf" ? "🤖" : trend.source === "rss" ? "📡" : "👤";
        const statusEmoji = trend.used ? "✅" : "⭕";
        console.log(
          `%c[TRENDS LOG]   [${index + 1}] ${sourceEmoji} "${trend.topic}" | source: ${trend.source} | status: ${statusEmoji} ${trend.used ? "Used" : "Available"} | id: ${trend.id}`,
          "color: gray;"
        );
      });
    }
    
    console.log("%c[TRENDS LOG] 📋 Full response:", "color: blue;");
    console.table(data);
    
    return data || [];
  } catch (e) {
    console.error("%c[TRENDS LOG] ❌ Failed to fetch trends:", "color: red; font-weight: bold;", e);
    throw new Error("Failed to fetch trends");
  }
}

export async function addTrend(topic: string) {
  console.log(`%c[TRENDS LOG] ➕ Adding manual trend: "${topic}"`, "color: blue; font-weight: bold;");
  try {
    const response = await fetch(`${API_BASE}/api/trends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, source: "manual" }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log(`%c[TRENDS LOG] ✅ Trend added successfully:`, "color: green; font-weight: bold;");
    console.log(`%c[TRENDS LOG]   Topic: "${data.topic}"`, "color: green;");
    console.log(`%c[TRENDS LOG]   Source: manual`, "color: green;");
    console.log(`%c[TRENDS LOG]   ID: ${data.id}`, "color: green;");
    return data;
  } catch (e) {
    console.error(`%c[TRENDS LOG] ❌ Failed to add trend "${topic}":`, "color: red; font-weight: bold;", e);
    throw new Error("Failed to add trend");
  }
}

// ====================================
// POSTS API
// ====================================

export async function fetchPosts() {
  console.log("[API] Fetching posts from /api/posts...");
  try {
    const response = await fetch(`${API_BASE}/api/posts`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Posts fetched:", data);
    return data || [];
  } catch (e) {
    console.error("[API] ❌ Failed to fetch posts:", e);
    throw new Error("Failed to fetch posts");
  }
}

export async function deletePost(id: string) {
  console.log("[API] Deleting post:", id);
  try {
    const response = await fetch(`${API_BASE}/api/posts/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    console.log("[API] ✅ Post deleted:", id);
  } catch (e) {
    console.error("[API] ❌ Failed to delete post:", e);
    throw new Error("Failed to delete post");
  }
}

export async function updatePostContent(id: string, content: string) {
  console.log("[API] Updating post content:", id);
  try {
    const response = await fetch(`${API_BASE}/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Post updated:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to update post:", e);
    throw new Error("Failed to update post");
  }
}

export async function updatePostSchedule(id: string, scheduledTime: string | null) {
  console.log("[API] Updating post schedule:", id, scheduledTime);
  try {
    const response = await fetch(`${API_BASE}/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_time: scheduledTime }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Post scheduled:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to update schedule:", e);
    throw new Error("Failed to update post schedule");
  }
}

// ====================================
// SETTINGS API
// ====================================

export async function fetchSettings() {
  console.log("[API] Fetching settings from /api/settings...");
  try {
    const response = await fetch(`${API_BASE}/api/settings`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Settings fetched:", data);
    return data[0] || {};
  } catch (e) {
    console.error("[API] ❌ Failed to fetch settings:", e);
    throw new Error("Failed to fetch settings");
  }
}

export async function updateSettings(updates: Record<string, unknown>) {
  console.log("[API] Updating settings:", updates);
  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Settings updated:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to update settings:", e);
    throw new Error("Failed to update settings");
  }
}

// ====================================
// GENERATION APIs
// ====================================

export async function generatePost(trendId: string, topic: string) {
  console.log("[API] Generating post for:", topic);
  try {
    const response = await fetch(`${API_BASE}/api/generate-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trendId, topic }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Post generated:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to generate post:", e);
    throw new Error("Failed to generate post");
  }
}

export async function generateTrends() {
  console.log("%c[TRENDS LOG] 🔵 Generating trends from /api/generate-trends...", "color: blue; font-weight: bold;");
  try {
    const startTime = performance.now();
    
    // Log AI attempt details
    console.log("%c[TRENDS LOG] 🤖 AI Trend Generation Attempt:", "color: purple; font-weight: bold;");
    console.log(`%c[TRENDS LOG]   Model: GROQ (qwen/qwen3-32b)`, "color: gray;");
    console.log(`%c[TRENDS LOG]   Source: API Endpoint`, "color: gray;");
    console.log("%c[TRENDS LOG] ⏳ Waiting for AI response...", "color: orange;");
    
    const response = await fetch(`${API_BASE}/api/generate-trends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    const duration = (performance.now() - startTime).toFixed(2);
    
    // Log success with source information
    if (data?.source === "groq" || data?.source === "hf") {
      console.log(`%c[TRENDS LOG] ✅ AI SUCCESS: Generated ${data?.added || 0} trends`, "color: green; font-weight: bold;");
      console.log(`%c[TRENDS LOG]   Source: ${data.source.toUpperCase()}`, "color: green;");
      console.log(`%c[TRENDS LOG]   Duration: ${duration}ms`, "color: green;");
      console.log(`%c[TRENDS LOG]   Topics: ${data?.topics?.join(", ") || "N/A"}`, "color: green;");
    } else if (data?.source === "rss") {
      console.log(`%c[TRENDS LOG] 📡 RSS FALLBACK: Fetched ${data?.added || 0} trends from Google Trends feed`, "color: orange; font-weight: bold;");
      console.log(`%c[TRENDS LOG]   Source: Google Trends RSS`, "color: orange;");
      console.log(`%c[TRENDS LOG]   Duration: ${duration}ms`, "color: orange;");
      console.log(`%c[TRENDS LOG]   Topics: ${data?.topics?.join(", ") || "N/A"}`, "color: orange;");
    }
    
    console.log("%c[TRENDS LOG] 📊 Full Response:", "color: blue; font-weight: bold;");
    console.table(data);
    
    return data;
  } catch (e) {
    console.error("%c[TRENDS LOG] ❌ Failed to generate trends:", "color: red; font-weight: bold;", e);
    console.log("%c[TRENDS LOG] 📋 Error Details:", "color: red;");
    console.log(e);
    throw new Error("Failed to generate trends");
  }
}

export async function postToFacebook(postId: string) {
  console.log("[API] Posting to Facebook:", postId);
  try {
    const response = await fetch(`${API_BASE}/api/post-to-facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Posted to Facebook:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to post to Facebook:", e);
    throw new Error("Failed to post to Facebook");
  }
}

export async function testConnection() {
  console.log("[API] Testing Prisma DB connection...");
  try {
    const response = await fetch(`${API_BASE}/api/test-connection`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Connection test:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Connection test failed:", e);
    throw new Error("Failed to test connection");
  }
}
