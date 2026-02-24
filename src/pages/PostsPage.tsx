import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPosts, deletePost, updatePostContent, updatePostSchedule } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Trash2, RefreshCw, Loader2, ThumbsUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function PostsPage() {
  const queryClient = useQueryClient();
  const [postingId, setPostingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: posts = [], isLoading } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["posts"] }); toast.success("Post deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const handlePostNow = async (postId: string) => {
    setPostingId(postId);
    try {
      const { error } = await supabase.functions.invoke("post-to-facebook", { body: { postId } });
      if (error) throw error;
      toast.success("Published to Facebook!");
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
      const { error } = await supabase.functions.invoke("fetch-engagement", { body: { postId, facebookPostId: fbPostId } });
      if (error) throw error;
      toast.success("Engagement refreshed");
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

  return (
    <Layout>
      <PageHeader title="Posts" description="Manage generated posts and publish to Facebook" />
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
                      <img src={p.image_url} alt="Post" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted" />
                    )}
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
                        <Button size="sm" variant="outline" disabled={postingId === p.id} onClick={() => handlePostNow(p.id)}>
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
