import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initFacebookSDK, facebookLogin, checkLoginStatus } from "@/lib/facebook-sdk";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    initFacebookSDK()
      .then(() => {
        setSdkReady(true);
        return checkLoginStatus();
      })
      .then((status) => {
        if (status.status === "connected") {
          navigate("/trends");
        }
      })
      .catch((e) => {
        console.error("[FB SDK] Failed to initialize:", e);
        setError("Failed to load Facebook SDK");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogin = async () => {
    setLoggingIn(true);
    setError("");
    try {
      const result = await facebookLogin();
      console.log("[FB LOGIN] ✅ Success:", result);

      if (result.pages.length > 0) {
        const page = result.pages[0];
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facebook_page_id: page.id,
            facebook_page_access_token: page.access_token,
          }),
        });
        console.log(`[FB LOGIN] ✅ Page "${page.name}" (${page.id}) saved`);
        navigate("/trends");
      } else {
        setError("No Facebook Pages found. Please create a Facebook Page first.");
      }
    } catch (e: any) {
      console.error("[FB LOGIN] ❌ Failed:", e);
      setError(e.message || "Facebook login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📈</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MyNitrends</h1>
            <p className="text-gray-500 mt-1">AI-Powered Social Media Automation</p>
          </div>

          <div className="mb-8 text-left bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-2">What this app does:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>📊 Discovers trending topics using AI</li>
              <li>✍️ Generates engaging social media posts</li>
              <li>🖼️ Creates AI-generated images for posts</li>
              <li>📱 Publishes directly to your Facebook Page</li>
              <li>📈 Tracks engagement and performance</li>
            </ul>
          </div>

          <div className="mb-6 text-left bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-700 mb-2">Permissions needed:</h3>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>✅ <strong>pages_manage_posts</strong> — Publish posts to your Page</li>
              <li>✅ <strong>pages_read_engagement</strong> — Read post engagement data</li>
              <li>✅ <strong>pages_show_list</strong> — List your Pages</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg p-3">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!sdkReady || loggingIn}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors"
          >
            {loggingIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/trends")}
            className="mt-4 w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
          >
            Skip login (development mode) →
          </button>

          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
            <div className="flex justify-center gap-4">
              <a href="/privacy" className="hover:text-gray-600">Privacy Policy</a>
              <a href="/terms" className="hover:text-gray-600">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
