import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPages, selectPage, fetchSettings, postToFacebook } from "@/lib/api-helpers";
import { toast } from "sonner";
import { RefreshCw, Loader2, CheckCircle, LayoutList } from "lucide-react";

const API_BASE = "";

/** Mask a token: show first 6 chars + ••• + last 4 chars */
function maskToken(token: string): string {
  if (!token) return "—";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}•••${token.slice(-4)}`;
}

export default function FacebookPagesPage() {
  const queryClient = useQueryClient();
  const [userToken, setUserToken] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // Fetch pages keyed on userToken — changing it refetches from Meta Graph API
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["pages", userToken],
    queryFn: () => fetchPages(userToken || undefined),
  });

  // Fetch current settings to know which page is active
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const activeFbPageId: string = settings?.facebook_page_id || "";

  const selectMutation = useMutation({
    mutationFn: ({ pageId, accessToken }: { pageId: string; accessToken: string }) =>
      selectPage(pageId, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Facebook Page set as default for publishing.");
    },
    onError: (e: any) => toast.error(e.message || "Failed to select page"),
    onSettled: () => setSelectingId(null),
  });

  const handleSelect = (page: { id: string; access_token: string }) => {
    setSelectingId(page.id);
    selectMutation.mutate({ pageId: page.id, accessToken: page.access_token });
  };

  const handleRefreshWithToken = () => {
    setUserToken(pendingToken);
    setTokenDialogOpen(false);
    // Invalidate so useQuery refires with new key
    queryClient.invalidateQueries({ queryKey: ["pages"] });
  };

  return (
    <Layout>
      <PageHeader
        title="Facebook Pages"
        description="Manage connected Facebook Pages and set a default for publishing"
        actions={
          <div className="flex gap-2">
            <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh Pages
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fetch Pages via User Token</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide a Facebook User Access Token to list all Pages your account manages.
                  Leave blank to use the environment fallback page.
                </p>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="fb-user-token">User Access Token</Label>
                    <Input
                      id="fb-user-token"
                      type="password"
                      placeholder="EAAGx..."
                      value={pendingToken}
                      onChange={(e) => setPendingToken(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleRefreshWithToken} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Fetch Pages
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Active page status card — shown when settings has a page configured */}
      {activeFbPageId && (
        <div className="mt-4 rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
            <LayoutList className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Active Page Configured
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Page ID:{" "}
              <span className="font-mono text-foreground">{activeFbPageId}</span>
              {settings?.facebook_page_access_token && (
                <>
                  {"  ·  "}Token:{" "}
                  <span className="font-mono text-foreground">
                    {maskToken(settings.facebook_page_access_token)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pages table */}
      <div className="border rounded-lg overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface">
              <TableHead>Page Name</TableHead>
              <TableHead>Page ID</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagesLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading pages…
                </TableCell>
              </TableRow>
            ) : pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No pages found. Ensure <code className="font-mono bg-muted px-1 rounded text-xs">VITE_FACEBOOK_PAGE_ID</code> is set, or click &ldquo;Refresh Pages&rdquo; with a User Access Token.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page: any) => {
                const isActive = page.id === activeFbPageId;
                return (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        )}
                        {page.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{page.id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {page.access_token ? maskToken(page.access_token) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={isActive ? "success" : "neutral"}>
                        {isActive ? "Active" : "Available"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isActive ? "secondary" : "outline"}
                        disabled={isActive || selectingId === page.id || selectMutation.isPending}
                        onClick={() => handleSelect(page)}
                      >
                        {selectingId === page.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isActive ? (
                          "Selected"
                        ) : (
                          "Select"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Selecting a page saves its credentials to settings and makes it the default target for all future
        Facebook posts. If no page is selected here, the app falls back to{" "}
        <code className="font-mono bg-muted px-1 rounded">VITE_FACEBOOK_PAGE_ID</code> /{" "}
        <code className="font-mono bg-muted px-1 rounded">VITE_FACEBOOK_PAGE_ACCESS_TOKEN</code>{" "}
        environment variables.
      </p>
    </Layout>
  );
}
