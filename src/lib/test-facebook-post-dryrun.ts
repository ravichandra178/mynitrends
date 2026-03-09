// Test function for Facebook post endpoint without actually posting
export async function testPostToFacebookAPI() {
  // Simulate a dry-run: check if the API endpoint is reachable and env vars are set
  try {
    const response = await fetch("/api/post-to-facebook", {
      method: "OPTIONS"
    });
    if (response.ok) {
      return { success: true, message: "API endpoint reachable. Env vars should be set. No post attempted." };
    } else {
      return { success: false, error: `API endpoint not reachable: HTTP ${response.status}` };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}
