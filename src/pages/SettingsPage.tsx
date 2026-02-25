import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchSettings, updateSettings } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const API_BASE = (import.meta as any).env?.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [form, setForm] = useState({
    openai_api_key: "",
    facebook_page_id: "",
    facebook_page_access_token: "",
    auto_post_enabled: false,
    max_posts_per_day: 3,
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        openai_api_key: settings.openai_api_key ?? "",
        facebook_page_id: settings.facebook_page_id ?? "",
        facebook_page_access_token: settings.facebook_page_access_token ?? "",
        auto_post_enabled: settings.auto_post_enabled ?? false,
        max_posts_per_day: settings.max_posts_per_day ?? 3,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const testConnection = async () => {
    if (!form.facebook_page_id || !form.facebook_page_access_token) {
      toast.error("Enter Page ID and Access Token first");
      return;
    }
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: form.facebook_page_id, accessToken: form.facebook_page_access_token }),
      });
      if (!response.ok) throw new Error('Connection test failed');
      const data = await response.json();
      if (data?.success) {
        toast.success(`Connected to: ${data.pageName}`);
      } else {
        toast.error(data?.error || "Connection failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></Layout>;

  return (
    <Layout>
      <PageHeader title="Settings" description="Configure API keys and automation preferences" />
      <div className="max-w-lg space-y-6">
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-medium">OpenAI Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="openai_key">API Key</Label>
            <Input
              id="openai_key"
              type="password"
              value={form.openai_api_key}
              onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
              placeholder="sk-..."
            />
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-medium">Facebook Configuration</h3>
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
              placeholder="Enter Page Access Token"
            />
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Test Facebook Connection
          </Button>
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
