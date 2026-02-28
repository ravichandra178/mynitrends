import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchSettings, updateSettings, testConnection, testGROQ, testHuggingFace, testRSS, testFacebookConnection } from "@/lib/api-helpers";
import { toast } from "sonner";

// Import API_BASE for direct API calls
const API_BASE = '';
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [form, setForm] = useState({
    facebook_page_id: "61586953905789",
    facebook_page_access_token: "",
    auto_post_enabled: false,
    max_posts_per_day: 3,
    groq_model: "llama-3.1-8b-instant",
    hf_model: "mistralai/Mistral-7B-Instruct-v0.2",
  });
  const [testing, setTesting] = useState(false);
  const [testingAI, setTestingAI] = useState({
    groq: false,
    huggingface: false,
    rss: false,
    facebook: false,
  });
  const [testResults, setTestResults] = useState({
    groq: null as any,
    huggingface: null as any,
    rss: null as any,
    facebook: null as any,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_page_id: settings.facebook_page_id || "61586953905789",
        facebook_page_access_token: settings.facebook_page_access_token ?? "",
        auto_post_enabled: settings.auto_post_enabled ?? false,
        max_posts_per_day: settings.max_posts_per_day ?? 3,
        groq_model: "llama-3.1-8b-instant", // Default, will be overridden by env vars
        hf_model: "meta-llama/Meta-Llama-3-8B-Instruct", // Default, will be overridden by env vars
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const testFacebookConnectionUI = async () => {
    if (!form.facebook_page_id || !form.facebook_page_access_token) {
      toast.error("Enter Page ID and Access Token first");
      return;
    }
    setTestingAI(prev => ({ ...prev, facebook: true }));
    try {
      const result = await testFacebookConnection(form.facebook_page_id, form.facebook_page_access_token);
      setTestResults(prev => ({ ...prev, facebook: result }));
      if (result.success) {
        toast.success(`Facebook working: ${result.message}`);
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
      const result = await testRSS();
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

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></Layout>;

  return (
    <Layout>
      <PageHeader title="Settings" description="Configure API keys and automation preferences" />
      <div className="max-w-lg space-y-6">
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-medium">Facebook Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="page_id">Page ID</Label>
            <Input
              id="page_id"
              value={form.facebook_page_id}
              onChange={(e) => setForm({ ...form, facebook_page_id: e.target.value })}
              placeholder="61586953905789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="access_token">Page Access Token</Label>
            <Input
              id="access_token"
              type="password"
              value={form.facebook_page_access_token}
              onChange={(e) => setForm({ ...form, facebook_page_access_token: e.target.value })}
              placeholder="Enter Page Access Token"
            />
          </div>
          <Button variant="outline" size="sm" onClick={testFacebookConnectionUI} disabled={testingAI.facebook}>
            {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Test Facebook Connection
          </Button>
        </div>

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
                placeholder="meta-llama/Meta-Llama-3-8B-Instruct"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  🤖
                </div>
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
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  🤗
                </div>
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
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  📡
                </div>
                <div>
                  <div className="font-medium">Google Trends RSS</div>
                  <div className="text-xs text-muted-foreground">trends.google.com</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResults.rss && (
                  <div className="flex items-center gap-1">
                    {testResults.rss.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">
                      {testResults.rss.success ? "Working" : "Failed"}
                    </span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testRSSConnection}
                  disabled={testingAI.rss}
                >
                  {testingAI.rss ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Test
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  📘
                </div>
                <div>
                  <div className="font-medium">Facebook Page</div>
                  <div className="text-xs text-muted-foreground">{form.facebook_page_id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResults.facebook && (
                  <div className="flex items-center gap-1">
                    {testResults.facebook.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">
                      {testResults.facebook.success ? "Working" : "Failed"}
                    </span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testFacebookConnectionUI}
                  disabled={testingAI.facebook || !form.facebook_page_id || !form.facebook_page_access_token}
                >
                  {testingAI.facebook ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Test
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-medium">Automation</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Post</Label>
              <p className="text-xs text-muted-foreground">Automatically post scheduled content</p>
            </div>
            <Switch checked={form.auto_post_enabled} onCheckedChange={(v) => setForm({ ...form, auto_post_enabled: v })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_posts">Max Posts Per Day</Label>
            <Input
              id="max_posts"
              type="number"
              min={1}
              max={20}
              value={form.max_posts_per_day}
              onChange={(e) => setForm({ ...form, max_posts_per_day: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Save Settings
        </Button>
      </div>
    </Layout>
  );
}
