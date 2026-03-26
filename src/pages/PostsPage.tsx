import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPosts, deletePost, updatePostContent, updatePostSchedule, postToFacebook, updatePostImage } from "@/lib/api-helpers";
import { toast } from "sonner";
import { Send, Trash2, RefreshCw, Loader2, ThumbsUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const API_BASE = "";

export default function PostsPage() {
  const queryClient = useQueryClient();
  const [postingId, setPostingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [facebookEnv, setFacebookEnv] = useState({
    pageId: "",
    accessToken: "",
  });
  const [postImageFiles, setPostImageFiles] = useState<Record<string, File | null>>({});

  const { data: posts = [], isLoading } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["posts"] }); toast.success("Post deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const loadFacebookEnv = () => {
    const env = (import.meta as any).env || {};
    setFacebookEnv({
      pageId: env.VITE_FACEBOOK_PAGE_ID || "",
      accessToken: env.VITE_FACEBOOK_PAGE_ACCESS_TOKEN || "",
    });
  };

  const handlePostNow = async (postId: string, post: any) => {
    setPostingId(postId);
    try {
      const env = (import.meta as any).env || {};
      const pageId = env.VITE_FACEBOOK_PAGE_ID || "";
      const accessToken = env.VITE_FACEBOOK_PAGE_ACCESS_TOKEN || "";

      if (post.image_url && pageId && accessToken) {
        // Try image post like settings UI
        try {
          const response = await fetch(`${API_BASE}/api/test-facebook-post`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId,
              accessToken,
              imageUrl: post.image_url,
              title: post.title || "",
              description: post.description || "",
              message: post.content || "",
            }),
          });
          const result = await response.json();
          if (!result.success) throw new Error(result.error || "Image post failed");

          // onboard fallback: mark as posted in backend DB
          await postToFacebook(postId, pageId, accessToken);
          toast.success("Published to Facebook with image!");
        } catch (imageErr) {
          console.warn("Image post failed, falling back to text post:", imageErr);
          await postToFacebook(postId, pageId, accessToken);
          toast.success("Published to Facebook as text fallback");
        }
      } else {
        await postToFacebook(postId, pageId || undefined, accessToken || undefined);
        toast.success("Published to Facebook");
      }

      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to publish");
    } finally {
      setPostingId(null);
    }
  };

  const handleRefreshEngagement = async (postId: string, fbPostId: string) => {
    setRefreshingId(postId);
    try {
      // TODO: Implement engagement fetch endpoint
      toast.info("Engagement fetch not yet implemented");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch engagement");
    } finally {
      setRefreshingId(null);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await updatePostContent(id, editContent);
      toast.success("Content updated");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleScheduleChange = async (id: string, value: string) => {
    try {
      await updatePostSchedule(id, new Date(value).toISOString());
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handlePostImageSelection = (postId: string, file: File | null) => {
    setPostImageFiles(prev => ({ ...prev, [postId]: file }));
  };

  const uploadPostImage = async (postId: string) => {
    const file = postImageFiles[postId];
    if (!file) {
      toast.error("Select a file first");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    try {
      await updatePostImage(postId, dataUrl);
      toast.success("Post image updated");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update post image");
    }
  };

  return (
    <Layout>
      <PageHeader title="Posts" description="Manage generated posts and publish to Facebook" />
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="text-sm text-muted-foreground">FB env pageId: {facebookEnv.pageId || "not set"}, token: {facebookEnv.accessToken ? "***" : "not set"}</div>
        <Button size="sm" variant="ghost" onClick={loadFacebookEnv}>Load Facebook Env</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : posts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No posts yet. Generate one from a trend.</TableCell></TableRow>
            ) : (
              posts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt="Post" 
                        className="w-16 h-16 rounded object-cover cursor-pointer hover:opacity-80 transition"
                        onClick={() => {
                          const img = new Image();
                          img.src = p.image_url;
                          const w = window.open("");
                          if (w) {
                            w.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#000"><img src="${p.image_url}" style="max-width:100%;max-height:100%"/></body></html>`);
                          }
                        }}
                        title="Click to view full size"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                    <div className="mt-1 space-y-1 text-xs">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-xs"
                        onChange={(e) => handlePostImageSelection(p.id, e.target.files?.[0] ?? null)}
                      />
                      <Button size="xs" onClick={() => uploadPostImage(p.id)} disabled={!postImageFiles[p.id]}>
                        Apply Image
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {editingId === p.id ? (
                      <div className="space-y-2">
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(p.id)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-sm whitespace-pre-line cursor-pointer hover:bg-accent rounded p-1 -m-1"
                        onClick={() => { setEditingId(p.id); setEditContent(p.content); }}
                        title="Click to edit"
                      >
                        {p.content.length > 120 ? p.content.slice(0, 120) + "…" : p.content}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      className="w-44 text-xs"
                      defaultValue={p.scheduled_time ? format(new Date(p.scheduled_time), "yyyy-MM-dd'T'HH:mm") : ""}
                      onChange={(e) => handleScheduleChange(p.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={p.posted ? "success" : "warning"}>{p.posted ? "Published" : "Draft"}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    {p.posted && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{p.engagement_likes ?? 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.engagement_comments ?? 0}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!p.posted && (
                        <Button size="sm" variant="outline" disabled={postingId === p.id} onClick={() => handlePostNow(p.id, p)}>
                          {postingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      )}
                      {p.posted && p.facebook_post_id && (
                        <Button size="sm" variant="outline" disabled={refreshingId === p.id} onClick={() => handleRefreshEngagement(p.id, p.facebook_post_id)}>
                          {refreshingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
