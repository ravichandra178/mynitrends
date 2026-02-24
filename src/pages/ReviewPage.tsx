import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSettings, fetchPosts } from "@/lib/supabase-helpers";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const FLOW_STEPS = ["Trend Detected", "Post Generated", "Image Generated", "Scheduled", "Published", "Engagement Synced"];

export default function ReviewPage() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: posts = [] } = useQuery({ queryKey: ["posts"], queryFn: async () => {
    const { data, error } = await (await import("@/integrations/supabase/client")).supabase
      .from("posts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }});

  const publishedPosts = posts.filter((p: any) => p.posted);
  const lastPublished = publishedPosts[0];

  // Build activity log from real posts
  const activities: { event: string; timestamp: string; status: "success" | "pending" }[] = [];
  posts.forEach((p: any) => {
    activities.push({ event: "Post Created", timestamp: p.created_at, status: "success" });
    if (p.posted && p.facebook_post_id) {
      activities.push({ event: "Post Published", timestamp: p.created_at, status: "success" });
    }
    if (p.engagement_likes > 0 || p.engagement_comments > 0) {
      activities.push({ event: "Engagement Synced", timestamp: p.created_at, status: "success" });
    }
  });
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const isConnected = !!settings?.facebook_page_id && !!settings?.facebook_page_access_token;

  return (
    <Layout>
      <PageHeader title="System Review" description="Real-time system status and activity" />

      {/* Page Connection */}
      <section className="border rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Page Connection</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {isConnected ? <CheckCircle className="h-4 w-4 text-badge-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
            <span>Status: {isConnected ? "Connected" : "Not Connected"}</span>
          </div>
          {settings?.facebook_page_id && (
            <p className="text-muted-foreground">Page ID: {settings.facebook_page_id}</p>
          )}
          {lastPublished && (
            <p className="text-muted-foreground">Last published: {format(new Date(lastPublished.created_at), "MMM d, yyyy h:mm a")}</p>
          )}
          <div className="mt-2">
            <p className="text-xs text-muted-foreground font-medium">Permissions used:</p>
            <div className="flex gap-2 mt-1">
              <StatusBadge variant="info">pages_manage_posts</StatusBadge>
              <StatusBadge variant="info">pages_read_engagement</StatusBadge>
            </div>
          </div>
        </div>
      </section>

      {/* Publishing Flow */}
      <section className="border rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">Publishing Flow</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {FLOW_STEPS.map((step, i) => {
            let done = false;
            if (lastPublished) {
              if (step === "Trend Detected" || step === "Post Generated" || step === "Image Generated") done = true;
              if (step === "Scheduled" && lastPublished.scheduled_time) done = true;
              if (step === "Published" && lastPublished.posted) done = true;
              if (step === "Engagement Synced" && (lastPublished.engagement_likes > 0 || lastPublished.engagement_comments > 0)) done = true;
            }
            return (
              <div key={step} className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded ${done ? "bg-badge-success text-badge-success-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step}
                </span>
                {i < FLOW_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="border rounded-lg overflow-hidden">
        <h3 className="text-sm font-medium p-4 pb-2">Recent Activity</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-surface">
              <TableHead>Event</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No activity yet</TableCell></TableRow>
            ) : (
              activities.slice(0, 20).map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{a.event}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(a.timestamp), "MMM d, h:mm:ss a")}</TableCell>
                  <TableCell><StatusBadge variant="success">Success</StatusBadge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </Layout>
  );
}
