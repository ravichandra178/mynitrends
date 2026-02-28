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

  const { data: trends = [], isLoading, error } = useQuery({ queryKey: ["trends"], queryFn: fetchTrends });

  console.log("[TrendsPage] trends:", trends, "loading:", isLoading, "error:", error);

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
      console.log("%c[TrendsPage] 🔵 Invoking generate-trends API...", "color: blue; font-weight: bold;");
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke("generate-trends");
      const duration = (performance.now() - startTime).toFixed(2);
      
      console.log("%c[API RESPONSE]", "color: green; font-weight: bold; font-size: 14px;");
      console.table(data);
      console.log("%cDuration: " + duration + "ms", "color: orange;");
      console.log("%cFull Response Object:", "color: purple;");
      console.log(data);
      console.log("%cError:", "color: red;");
      console.log(error);
      
      if (error) {
        console.error("%c[TrendsPage] ❌ Error from API:", "color: red; font-weight: bold;", error);
        throw error;
      }
      
      if (data?.added > 0) {
        console.log(`%c✅ Success! Added ${data.added} topics from ${data.source}`, "color: green; font-weight: bold;");
        console.log("%cTopics added:", "color: blue;", data.topics);
        toast.success(`Added ${data.added} trending topics (${data.source})`);
        queryClient.invalidateQueries({ queryKey: ["trends"] });
      } else {
        console.log("%c⚠️ No new trends added", "color: orange; font-weight: bold;");
        console.log(data?.message);
        toast.info(data?.message || "No new trends found");
      }
    } catch (e: any) {
      console.error("%c[TrendsPage] ❌ generate-trends failed:", "color: red; font-weight: bold;", e);
      console.log("Error details:", {
        message: e.message,
        stack: e.stack,
        fullError: e
      });
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleFetchTrends} disabled={fetchingTrends}>
              {fetchingTrends ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}
              Generate Trends
            </Button>
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
          </div>
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
              trends.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.topic}</TableCell>
                  <TableCell><StatusBadge variant={t.source === "AI" || t.source === "auto" ? "info" : "neutral"}>{t.source}</StatusBadge></TableCell>
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
