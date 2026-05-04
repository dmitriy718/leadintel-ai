import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Globe, Building2, MapPin, Eye, Code } from "lucide-react";

export default function Visitors() {
  usePageTitle("Visitors");
  const { data: keyData } = trpc.visitor.getTrackingKey.useQuery();
  const { data: stats } = trpc.visitor.stats.useQuery();
  const { data: visitors } = trpc.visitor.list.useQuery({ limit: 50, offset: 0 });

  const trackingKey = keyData?.trackingKey;
  const scriptTag = `<script src="${window.location.origin}/track.js" data-key="${trackingKey}" async></script>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Website Visitors</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Identify companies visiting your website
        </p>
      </div>

      {/* Tracking Setup */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Code className="h-4 w-4" />
          Tracking Script
        </h2>
        <p className="text-sm text-muted-foreground">
          Add this script to your website's <code>&lt;head&gt;</code> to start identifying visitors:
        </p>
        <div className="flex gap-2">
          <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs overflow-x-auto">
            {scriptTag}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(scriptTag);
              toast.success("Script copied!");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.totalVisitors ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total Visitors</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.uniqueCompanies ?? 0}</p>
          <p className="text-xs text-muted-foreground">Companies</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats?.todayVisitors ?? 0}</p>
          <p className="text-xs text-muted-foreground">Tracked</p>
        </div>
      </div>

      {/* Visitor List */}
      <div className="space-y-3">
        <h2 className="font-semibold">Recent Visitors</h2>
        {visitors && visitors.length > 0 ? (
          <div className="space-y-2">
            {visitors.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {v.org || "Unknown Organization"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v.domain && <span>{v.domain}</span>}
                      {v.city && v.country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.city}, {v.country}
                        </span>
                      )}
                    </div>
                    {v.page && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <Globe className="h-3 w-3 inline mr-1" />
                        {v.page}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {v.visitCount} visit{v.visitCount > 1 ? "s" : ""}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {v.lastSeenAt ? new Date(v.lastSeenAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No visitors tracked yet. Install the tracking script on your website to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
