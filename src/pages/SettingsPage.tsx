import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";

// Dummy fetchSettings function for illustration
const fetchSettings = async () => {
  return {
    facebook_page_id: "123456789",
    facebook_page_access_token: "abc123xyz",
  };
};

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [form, setForm] = useState({
    facebook_page_id: "",
    facebook_page_access_token: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_page_id: settings.facebook_page_id || "",
        facebook_page_access_token: settings.facebook_page_access_token || "",
      });
    }
  }, [settings]);

  const testFacebookConnection = async () => {
    if (!form.facebook_page_id || !form.facebook_page_access_token) {
      alert("Enter Page ID and Access Token first");
      return;
    }
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: form.facebook_page_id,
          accessToken: form.facebook_page_access_token,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`Facebook connection successful: ${result.name}`);
      } else {
        alert(`Facebook connection failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error testing Facebook connection: ${error.message}`);
    }
  };

  if (isLoading) return <Layout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-lg space-y-6">
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
          <Button variant="outline" size="sm" onClick={testFacebookConnection}>
            Test Facebook Connection
          </Button>
        </div>
      </div>
    </Layout>
  );
}
