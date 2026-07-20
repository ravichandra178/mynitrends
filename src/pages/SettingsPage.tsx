import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchSettings, updateSettings } from "@/lib/api-helpers";
import { toast } from "sonner";

// Import API_BASE for direct API calls
const API_BASE = '';
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const envMeta = (import.meta as any).env || {};
const getEnvValue = (key: string) => String(envMeta[key] || envMeta[`VITE_${key}`] || "").trim();

const aiEnvDefaults = {
  facebook_app_id: getEnvValue("FACEBOOK_APP_ID"),
  facebook_page_id: getEnvValue("FACEBOOK_PAGE_ID"),
  facebook_page_access_token: getEnvValue("FACEBOOK_PAGE_ACCESS_TOKEN"),
  groq_model: getEnvValue("GROQ_MODEL") || "llama-3.1-8b-instant",
  hf_model: getEnvValue("HF_MODEL") || getEnvValue("HUGGINGFACE_MODEL") || "Qwen/Qwen2.5-7B-Instruct",
  hf_image_model: getEnvValue("HF_IMAGE_MODEL") || "black-forest-labs/FLUX.1-dev",
};

const hfApiKeyPlaceholder = getEnvValue("HUGGINGFACE_API_KEY") ? "••••••••" : "not configured";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [form, setForm] = useState({
    facebook_app_id: aiEnvDefaults.facebook_app_id || "",
    facebook_page_id: aiEnvDefaults.facebook_page_id || "",
    facebook_page_access_token: aiEnvDefaults.facebook_page_access_token || "",
    facebook_image_url: "",
    facebook_image_title: "",
    facebook_image_description: "",
    facebook_image_message: "Test Facebook image post",
    auto_post_enabled: false,
    max_posts_per_day: 3,
    groq_model: aiEnvDefaults.groq_model,
    hf_model: aiEnvDefaults.hf_model,
    hf_image_model: aiEnvDefaults.hf_image_model,
  });
  const [testingAI, setTestingAI] = useState({
    groq: false,
    huggingface: false,
    hfImage: false,
    hfTrends: false,
    rss: false,
    facebook: false,
    generatePost: false,
  });
  const [testResults, setTestResults] = useState({
    groq: null as any,
    huggingface: null as any,
    hfImage: null as any,
    hfTrends: null as any,
    rss: null as any,
    facebook: null as any,
    generatePost: null as any,
  });
  const [envPreview, setEnvPreview] = useState({
    facebook_app_id: "",
    facebook_page_id: "",
    facebook_page_access_token: "",
  });
  const [facebookFile, setFacebookFile] = useState<File | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_app_id: settings.facebook_app_id || aiEnvDefaults.facebook_app_id || "",
        facebook_page_id: settings.facebook_page_id || aiEnvDefaults.facebook_page_id || "",
        facebook_page_access_token: settings.facebook_page_access_token ?? aiEnvDefaults.facebook_page_access_token ?? "",
        facebook_image_url: settings.facebook_image_url || "",
        facebook_image_title: settings.facebook_image_title || "",
        facebook_image_description: settings.facebook_image_description || "",
        facebook_image_message: settings.facebook_image_message || "Test Facebook image post",
        auto_post_enabled: settings.auto_post_enabled ?? false,
        max_posts_per_day: settings.max_posts_per_day ?? 3,
        groq_model: settings.groq_model || aiEnvDefaults.groq_model,
        hf_model: settings.hf_model || aiEnvDefaults.hf_model,
        hf_image_model: settings.hf_image_model || aiEnvDefaults.hf_image_model,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const testFacebookConnectionEnv = async () => {
    setTestingAI(prev => ({ ...prev, facebook: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, facebook: result }));
      if (result.success) {
        toast.success(`Facebook working: ${result.pageName || result.message}`);
      } else {
        toast.error(`Facebook failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, facebook: { success: false, error: e.message } }));
      toast.error(`Facebook test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, facebook: false }));
    }
  };

  const testFacebookConnectionUser = async () => {
    setTestingAI(prev => ({ ...prev, facebook: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: form.facebook_page_id,
          accessToken: form.facebook_page_access_token,
        }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, facebook: result }));
      if (result.success) {
        toast.success(`Facebook working: ${result.pageName || result.message}`);
      } else {
        toast.error(`Facebook failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, facebook: { success: false, error: e.message } }));
      toast.error(`Facebook test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, facebook: false }));
    }
  };

  const testGROQConnection = async () => {
    setTestingAI(prev => ({ ...prev, groq: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-groq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: form.groq_model }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, groq: result }));
      if (result.success) {
        toast.success(`GROQ working: ${result.message}`);
      } else {
        toast.error(`GROQ failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, groq: { success: false, error: e.message } }));
      toast.error(`GROQ test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, groq: false }));
    }
  };

  const testHFConnection = async () => {
    setTestingAI(prev => ({ ...prev, huggingface: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-huggingface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: form.hf_model }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, huggingface: result }));
      if (result.success) {
        toast.success(`Hugging Face working: ${result.message}`);
      } else {
        toast.error(`Hugging Face failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, huggingface: { success: false, error: e.message } }));
      toast.error(`Hugging Face test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, huggingface: false }));
    }
  };

  const testRSSConnection = async () => {
    setTestingAI(prev => ({ ...prev, rss: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-rss`, {
        method: "POST",
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, rss: result }));
      if (result.success) {
        toast.success(`RSS working: ${result.message}`);
      } else {
        toast.error(`RSS failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, rss: { success: false, error: e.message } }));
      toast.error(`RSS test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, rss: false }));
    }
  };

  const testHFImageGeneration = async () => {
    setTestingAI(prev => ({ ...prev, hfImage: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-hf-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: form.hf_image_model }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, hfImage: result }));
      if (result.success) {
        toast.success(`HF Image working: ${result.message}`);
      } else {
        toast.error(`HF Image failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, hfImage: { success: false, error: e.message } }));
      toast.error(`HF Image test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, hfImage: false }));
    }
  };

  const testHFTrendsGeneration = async () => {
    setTestingAI(prev => ({ ...prev, hfTrends: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-hf-trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, hfTrends: result }));
      if (result.success) {
        toast.success(`HF Trends working: ${result.message}`);
      } else {
        toast.error(`HF Trends failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, hfTrends: { success: false, error: e.message } }));
      toast.error(`HF Trends test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, hfTrends: false }));
    }
  };

  const testGeneratePost = async () => {
    setTestingAI(prev => ({ ...prev, generatePost: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-generate-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "artificial intelligence trends" }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, generatePost: result }));
      if (result.success) {
        toast.success(`Post generation working: "${result.postText?.substring(0, 50)}..."`);
      } else {
        toast.error(`Post generation failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, generatePost: { success: false, error: e.message } }));
      toast.error(`Post generation test failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, generatePost: false }));
    }
  };

  const testFacebookImagePost = async () => {
    setTestingAI(prev => ({ ...prev, facebook: true }));
    try {
      const response = await fetch(`${API_BASE}/api/test-facebook-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: form.facebook_page_id || form.facebook_app_id,
          accessToken: form.facebook_page_access_token,
          imageUrl: form.facebook_image_url,
          title: form.facebook_image_title,
          description: form.facebook_image_description,
          message: form.facebook_image_message,
        }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, facebook: result }));
      if (result.success) {
        toast.success(`Facebook image post successful: ${result.facebookPostId || result.id}`);
      } else {
        toast.error(`Facebook image post failed: ${result.error}`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, facebook: { success: false, error: e.message } }));
      toast.error(`Facebook image post failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, facebook: false }));
    }
  };

  const testFacebookImageUpload = async () => {
    setTestingAI(prev => ({ ...prev, facebook: true }));
    try {
      const pageId = form.facebook_page_id || form.facebook_app_id;
      const accessToken = form.facebook_page_access_token;
      if (!pageId || !accessToken) throw new Error("Missing Page ID or Access Token");
      if (!facebookFile) throw new Error("No image file selected");

      const formData = new FormData();
      formData.append("source", facebookFile);
      formData.append("caption", form.facebook_image_message || "Facebook image upload test");
      formData.append("access_token", accessToken);

      const fbRes = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
        method: "POST",
        body: formData,
      });
      const result = await fbRes.json();

      if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
      setTestResults(prev => ({ ...prev, facebook: { success: true, facebookPostId: result.post_id || result.id } }));
      toast.success(`Facebook upload successful: ${result.post_id || result.id}`);
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, facebook: { success: false, error: e.message } }));
      toast.error(`Facebook upload failed: ${e.message}`);
    } finally {
      setTestingAI(prev => ({ ...prev, facebook: false }));
    }
  };

  const loadFacebookEnv = () => {
    const envMeta = (import.meta as any).env || {};
    const appId = envMeta.VITE_FACEBOOK_APP_ID || "";
    const pageId = envMeta.VITE_FACEBOOK_PAGE_ID || "";
    const pageToken = envMeta.VITE_FACEBOOK_PAGE_ACCESS_TOKEN || "";
    setForm((prev) => ({
      ...prev,
      facebook_app_id: appId || prev.facebook_app_id,
      facebook_page_id: pageId || prev.facebook_page_id,
      facebook_page_access_token: pageToken || prev.facebook_page_access_token,
    }));
    setEnvPreview({
      facebook_app_id: appId || "not set",
      facebook_page_id: pageId || "not set",
      facebook_page_access_token: pageToken ? "***" : "not set",
    });
  };

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></Layout>;
  return (
    <Layout>
      <PageHeader title="Settings" description="Configure API keys and automation preferences" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-medium">Facebook Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="app_id">App ID</Label>
              <Input
                id="app_id"
                value={form.facebook_app_id}
                onChange={(e) => setForm({ ...form, facebook_app_id: e.target.value })}
                placeholder="Enter Facebook App ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page_id">Page ID</Label>
              <Input
                id="page_id"
                value={form.facebook_page_id}
                onChange={(e) => setForm({ ...form, facebook_page_id: e.target.value })}
                placeholder="Enter Facebook Page ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access_token">Page Access Token</Label>
              <Input
                id="access_token"
                type="password"
                value={form.facebook_page_access_token}
                onChange={(e) => setForm({ ...form, facebook_page_access_token: e.target.value })}
                placeholder="Enter Facebook Page Access Token"
              />
            </div>
            <Button variant="outline" size="sm" onClick={testFacebookConnectionUser} disabled={testingAI.facebook}>
              {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Test Facebook Page Connection
            </Button>
            <Button variant="ghost" size="sm" onClick={testFacebookConnectionEnv} disabled={testingAI.facebook}>
              {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              DEFAULT ENV TEST
            </Button>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-medium">Automation Settings</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto_post_enabled" className="mr-4">Enable Auto Posting</Label>
              <Switch
                id="auto_post_enabled"
                checked={form.auto_post_enabled}
                onCheckedChange={(checked) => setForm({ ...form, auto_post_enabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_posts_per_day">Max Posts Per Day</Label>
              <Input
                id="max_posts_per_day"
                type="number"
                value={form.max_posts_per_day}
                onChange={(e) => setForm({ ...form, max_posts_per_day: Number(e.target.value) })}
                placeholder="Enter max posts per day"
              />
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
            >
              {saveMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-medium">AI Model Testing</h3>
            <p className="text-xs text-muted-foreground">Test your AI models and RSS feed connectivity</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groq_model">GROQ Model</Label>
                <Input
                  id="groq_model"
                  value={form.groq_model}
                  onChange={(e) => setForm({ ...form, groq_model: e.target.value })}
                  placeholder="llama-3.1-8b-instant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hf_model">Hugging Face Model</Label>
                <Input
                  id="hf_model"
                  value={form.hf_model}
                  onChange={(e) => setForm({ ...form, hf_model: e.target.value })}
                  placeholder="Qwen/Qwen2.5-7B-Instruct"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hf_image_model">HF Image Generation Model</Label>
                <Input
                  id="hf_image_model"
                  value={form.hf_image_model}
                  onChange={(e) => setForm({ ...form, hf_image_model: e.target.value })}
                  placeholder="black-forest-labs/FLUX.1-dev"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hf_api_key">Hugging Face API Key</Label>
                <Input
                  id="hf_api_key"
                  type="password"
                  value={hfApiKeyPlaceholder}
                  readOnly
                  disabled
                  placeholder="Set HUGGINGFACE_API_KEY in deployment settings"
                />
                <p className="text-xs text-muted-foreground">
                  The Hugging Face token is read from the deployment environment and is never exposed in the UI.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">🤖</div>
                  <div>
                    <div className="font-medium">GROQ API</div>
                    <div className="text-xs text-muted-foreground">{form.groq_model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.groq && (
                    <div className="flex items-center gap-1">
                      {testResults.groq.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {testResults.groq.success ? "Working" : "Failed"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testGROQConnection}
                    disabled={testingAI.groq}
                  >
                    {testingAI.groq ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">🤗</div>
                  <div>
                    <div className="font-medium">Hugging Face</div>
                    <div className="text-xs text-muted-foreground">{form.hf_model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.huggingface && (
                    <div className="flex items-center gap-1">
                      {testResults.huggingface.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {testResults.huggingface.success ? "Working" : "Failed"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testHFConnection}
                    disabled={testingAI.huggingface}
                  >
                    {testingAI.huggingface ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">🖼️</div>
                  <div>
                    <div className="font-medium">HF Image Generation</div>
                    <div className="text-xs text-muted-foreground">{form.hf_image_model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.hfImage && (
                    <div className="flex items-center gap-1">
                      {testResults.hfImage.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {testResults.hfImage.success ? "Working" : "Failed"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testHFImageGeneration}
                    disabled={testingAI.hfImage}
                  >
                    {testingAI.hfImage ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
              </div>

              {testResults.hfImage?.success && testResults.hfImage?.imageUrl && (
                <div className="p-3 border rounded bg-gray-50">
                  <p className="text-xs text-muted-foreground mb-2">Generated test image ({testResults.hfImage.sizeKB}KB):</p>
                  <img
                    src={testResults.hfImage.imageUrl}
                    alt="HF Test Image"
                    className="w-full max-w-[256px] rounded-lg border"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">📊</div>
                  <div>
                    <div className="font-medium">HF Trends Generation</div>
                    <div className="text-xs text-muted-foreground">{form.hf_model} → trends</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.hfTrends && (
                    <div className="flex items-center gap-1">
                      {testResults.hfTrends.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {testResults.hfTrends.success ? "Working" : "Failed"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testHFTrendsGeneration}
                    disabled={testingAI.hfTrends}
                  >
                    {testingAI.hfTrends ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">📝</div>
                  <div>
                    <div className="font-medium">Post Generation</div>
                    <div className="text-xs text-muted-foreground">Auto post topic</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.generatePost && (
                    <div className="flex items-center gap-1">
                      {testResults.generatePost.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs">
                        {testResults.generatePost.success ? "Working" : "Failed"}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testGeneratePost}
                    disabled={testingAI.generatePost}
                  >
                    {testingAI.generatePost ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-medium">Facebook Image Post Test</h3>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={form.facebook_image_url}
                onChange={(e) => setForm({ ...form, facebook_image_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_title">Image Title</Label>
              <Input
                id="image_title"
                value={form.facebook_image_title}
                onChange={(e) => setForm({ ...form, facebook_image_title: e.target.value })}
                placeholder="Your image title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_description">Image Description</Label>
              <Input
                id="image_description"
                value={form.facebook_image_description}
                onChange={(e) => setForm({ ...form, facebook_image_description: e.target.value })}
                placeholder="Description for your image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_message">Message</Label>
              <Input
                id="image_message"
                value={form.facebook_image_message}
                onChange={(e) => setForm({ ...form, facebook_image_message: e.target.value })}
                placeholder="Caption for your post"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_file">Upload Local Image</Label>
              <Input
                id="image_file"
                type="file"
                accept="image/*"
                onChange={(e) => setFacebookFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={testFacebookImagePost} disabled={testingAI.facebook}>
                {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Test Facebook Image Post
              </Button>
              <Button variant="secondary" size="sm" onClick={testFacebookImageUpload} disabled={testingAI.facebook || !facebookFile}>
                {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Upload Local Image Test
              </Button>
              <Button variant="ghost" size="sm" onClick={loadFacebookEnv}>
                Load from Env
              </Button>
            </div>
            {(envPreview.facebook_app_id || envPreview.facebook_page_id || envPreview.facebook_page_access_token) && (
              <div className="mt-3 p-3 border rounded bg-slate-50 text-sm">
                <div className="font-medium">Env values loaded</div>
                <div className="mt-1">App ID: {envPreview.facebook_app_id}</div>
                <div>Page ID: {envPreview.facebook_page_id}</div>
                <div>Page Access Token: {envPreview.facebook_page_access_token}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
