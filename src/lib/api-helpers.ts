// API Helper Functions - Direct calls to Deno backend
// Single source of truth: Prisma PostgreSQL Database

const API_BASE = '';  // Relative URL (same origin)

// ====================================
// TRENDS API
// ====================================

export async function fetchTrends() {
  console.log("[API] Fetching trends from /api/trends...");
  try {
    const response = await fetch(`${API_BASE}/api/trends`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Trends fetched:", data);
    return data || [];
  } catch (e) {
    console.error("[API] ❌ Failed to fetch trends:", e);
    throw new Error("Failed to fetch trends");
  }
}

export async function addTrend(topic: string) {
  console.log("[API] Adding trend:", topic);
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
    console.log("[API] ✅ Trend added:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to add trend:", e);
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
  console.log("[API] Generating trends from /api/generate-trends...");
  try {
    const response = await fetch(`${API_BASE}/api/generate-trends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    console.log("[API] ✅ Trends generated:", data);
    return data;
  } catch (e) {
    console.error("[API] ❌ Failed to generate trends:", e);
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
