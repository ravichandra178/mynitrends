import { useState } from "react";
import { postToFacebook } from "@/lib/api-helpers";
import { Button, Input } from "@/components/ui";
import { toast } from "sonner";

export function FacebookPostTest({ pageId, accessToken }: { pageId: string, accessToken: string }) {
  const [postId, setPostId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await postToFacebook(postId);
      setResult(res);
      toast.success("Posted to Facebook (test): " + JSON.stringify(res));
    } catch (e: any) {
      setResult({ error: e.message });
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input value={postId} onChange={e => setPostId(e.target.value)} placeholder="Enter Post ID to test post" />
      <Button onClick={handleTest} disabled={loading || !postId} variant="outline" size="sm">
        {loading ? "Posting..." : "Test Post to Facebook"}
      </Button>
      {result && (
        <div className="text-xs mt-2">
          {result.error ? <span className="text-red-600">{result.error}</span> : <span className="text-green-600">{JSON.stringify(result)}</span>}
        </div>
      )}
    </div>
  );
}
