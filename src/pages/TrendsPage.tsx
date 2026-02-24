import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchTrends, addTrend } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function TrendsPage() {
  const [newTopic, setNewTopic] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [fetchingTrends, setFetchingTrends] = useState(false);
  const queryClient = useQueryClient();

  const { data: trends = [], isLoading } = useQuery({ queryKey: ["trends"], queryFn: fetchTrends });

  const addMutation = useMutation({
    mutationFn: addTrend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trends"] });
      setNewTopic("");
      setDialogOpen(false);
      toast.success("Trend added");
    },
    onError: () => toast.error("Failed to add trend"),
  });

  const handleGenerate = async (trendId: string, topic: string) => {
    setGeneratingId(trendId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: { trendId, topic },
      });
      if (error) throw error;
      toast.success("Post generated successfully");
      queryClient.invalidateQueries({ queryKey: ["trends"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate post");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFetchTrends = async () => {
    setFetchingTrends(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trends");
      if (error) throw error;
      if (data?.added > 0) {
        toast.success(`Added ${data.added} trending topics`);
        queryClient.invalidateQueries({ queryKey: ["trends"] });
      } else {
        toast.info(data?.message || "No new trends found");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch trends");
    } finally {
      setFetchingTrends(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Trends"
        description="Manage trending topics and generate posts"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Trend</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Trend</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); if (newTopic.trim()) addMutation.mutate(newTopic.trim()); }}
                className="flex gap-2 mt-2"
              >
                <Input placeholder="Enter topic..." value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
                <Button type="submit" disabled={addMutation.isPending}>Add</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface">
              <TableHead>Topic</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : trends.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No trends yet. Add one to get started.</TableCell></TableRow>
            ) : (
              trends.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.topic}</TableCell>
                  <TableCell><StatusBadge variant={t.source === "auto" ? "info" : "neutral"}>{t.source}</StatusBadge></TableCell>
                  <TableCell>
                    <StatusBadge variant={t.used ? "success" : "warning"}>{t.used ? "Used" : "Available"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(t.created_at), "MMM d, h:mm a")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={t.used || generatingId === t.id}
                      onClick={() => handleGenerate(t.id, t.topic)}
                    >
                      {generatingId === t.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Generate Post
                    </Button>
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
