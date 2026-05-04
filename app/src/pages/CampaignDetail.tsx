import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Play, Loader2, Star, ExternalLink, Clock, TrendingUp, Hash, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ScrapeProgress from "@/components/ScrapeProgress";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-stone-100 text-stone-600",
  completed: "bg-sky-100 text-sky-700",
};

export default function CampaignDetail() {
  usePageTitle("Campaign");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const campaignId = Number(id);
  const isValidCampaignId = Number.isFinite(campaignId) && campaignId > 0;
  const utils = trpc.useUtils();

  const { data: campaign, isLoading } = trpc.campaign.get.useQuery(
    { id: campaignId },
    { enabled: isValidCampaignId }
  );
  const { data: leadsData } = trpc.lead.list.useQuery(
    { campaignId, limit: 50, offset: 0 },
    { enabled: isValidCampaignId }
  );

  // Poll jobs list every 3s while the latest job is running
  const { data: jobs } = trpc.scrape.jobs.useQuery(
    { campaignId },
    {
      enabled: isValidCampaignId,
      refetchInterval: (query) => {
        const latest = query.state.data?.[0];
        return latest?.status === "running" || latest?.status === "pending" ? 3000 : false;
      },
    }
  );

  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const prevJobRef = useRef<NonNullable<typeof jobs>[number] | undefined>(undefined);

  const invalidateAll = useCallback(() => {
    utils.lead.list.invalidate({ campaignId });
    utils.lead.list.invalidate();
    utils.lead.stats.invalidate();
    utils.campaign.list.invalidate();
    utils.campaign.get.invalidate({ id: campaignId });
    utils.scrape.jobs.invalidate({ campaignId });
  }, [utils, campaignId]);

  // Detect job completion transitions and show toasts
  useEffect(() => {
    const latest = jobs?.[0];
    const prev = prevJobRef.current;
    if (prev?.status === "running" && latest) {
      if (latest.status === "completed") {
        queueMicrotask(() => {
          setScrapeProgress(100);
          invalidateAll();
          toast.success(`Scraping complete! Found ${latest.leadsFound} leads.`);
          setTimeout(() => setScrapeProgress(0), 1500);
        });
      } else if (latest.status === "failed") {
        queueMicrotask(() => {
          setScrapeProgress(100);
          invalidateAll();
          toast.error(`Scraping failed: ${latest.errorMessage || "Unknown error"}`);
          setTimeout(() => setScrapeProgress(0), 1500);
        });
      }
    }
    prevJobRef.current = latest;
  }, [jobs, invalidateAll]);

  const runScrape = trpc.scrape.run.useMutation({
    onSuccess: () => {
      toast.success("Scraping job started!");
      setScrapeProgress(5);
      utils.campaign.list.invalidate();
      utils.campaign.get.invalidate({ id: campaignId });
      utils.scrape.jobs.invalidate({ campaignId });
    },
    onError: (e) => toast.error(e.message),
  });

  const latestJobStatus = jobs?.[0]?.status;

  // Progress animation while scraping
  useEffect(() => {
    const isRunning = latestJobStatus === "running" || latestJobStatus === "pending" || runScrape.isPending;
    if (!isRunning) {
      queueMicrotask(() => setScrapeProgress(0));
      return;
    }
    const interval = setInterval(() => {
      setScrapeProgress(p => {
        if (p >= 95) return 95;
        const increment = Math.random() * 8 + 2;
        return Math.min(p + increment, 95);
      });
    }, 600);
    return () => clearInterval(interval);
  }, [latestJobStatus, runScrape.isPending]);

  const toggleFavorite = trpc.lead.toggleFavorite.useMutation({
    onSuccess: () => utils.lead.list.invalidate(),
  });
  const updateNotes = trpc.lead.updateNotes.useMutation({
    onSuccess: () => {
      utils.lead.list.invalidate();
      toast.success("Notes saved!");
    },
  });

  const selectedLeadData = leadsData?.leads.find(l => l.id === selectedLead);

  if (!isValidCampaignId) {
    return <div className="text-center py-12 text-stone-500">Invalid campaign ID</div>;
  }
  if (isLoading) return <div className="text-center py-12">Loading...</div>;
  if (!campaign) return <div className="text-center py-12 text-stone-500">Campaign not found</div>;

  const latestJob = jobs?.[0];
  const isJobRunning = latestJob?.status === "running" || latestJob?.status === "pending" || runScrape.isPending;

  const handleRunScrape = () => {
    if (latestJob?.status === "running" || latestJob?.status === "pending") {
      toast.info("A scrape is already in progress for this campaign.");
      return;
    }
    runScrape.mutate({ campaignId });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge className={STATUS_COLORS[campaign.status] || ""}>{campaign.status}</Badge>
          </div>
          {campaign.description && <p className="text-stone-500 text-sm mt-1">{campaign.description}</p>}
        </div>
        <Button
          onClick={handleRunScrape}
          disabled={isJobRunning}
          className="bg-stone-900 text-stone-50 hover:bg-stone-800 shrink-0"
        >
          {isJobRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          {isJobRunning ? "Scraping..." : "Run Scraper"}
        </Button>
      </div>

      {/* Progress bar */}
      {isJobRunning && (
        <ScrapeProgress progress={scrapeProgress} />
      )}

      {/* Campaign Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Hash className="h-4 w-4" /> Keywords
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {campaign.keywords.map(k => <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <BarChart3 className="h-4 w-4" /> Channels
            </div>
            <p className="text-lg font-semibold mt-1">{campaign.channels.length}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <TrendingUp className="h-4 w-4" /> Leads Found
            </div>
            <p className="text-lg font-semibold mt-1">{leadsData?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Clock className="h-4 w-4" /> Last Run
            </div>
            <p className="text-lg font-semibold mt-1">
              {latestJob?.startedAt ? new Date(latestJob.startedAt).toLocaleDateString() : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="leads">Leads ({leadsData?.total || 0})</TabsTrigger>
          <TabsTrigger value="jobs">Job History ({jobs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          {(!leadsData?.leads || leadsData.leads.length === 0) ? (
            <div className="text-center py-12 text-stone-500 border border-stone-200 border-dashed">
              {isJobRunning ? "Scraping in progress... leads will appear here shortly." : "No leads yet. Run the scraper to discover leads."}
            </div>
          ) : (
            <div className="space-y-3">
              {leadsData.leads.map(lead => (
                <Card key={lead.id} className="border-stone-200 hover:border-stone-400 transition-colors cursor-pointer" onClick={() => { setSelectedLead(lead.id); setNotes(lead.notes || ""); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-sm">{lead.displayName || lead.username}</h4>
                          <Badge variant="outline" className="text-xs capitalize">{lead.source}</Badge>
                          <button
                            className="ml-auto p-1 hover:bg-stone-100"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate({ id: lead.id }); }}
                          >
                            <Star className={`h-4 w-4 ${lead.isFavorite ? "fill-amber-400 text-amber-400" : "text-stone-400"}`} />
                          </button>
                        </div>
                        {lead.title && <p className="text-sm font-medium mt-1 truncate">{lead.title}</p>}
                        <p className="text-sm text-stone-500 mt-1 line-clamp-2">{lead.content}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {lead.keywordMatches?.map(k => (
                            <span key={k} className="text-xs px-1.5 py-0.5 border border-stone-200 text-stone-600">{k}</span>
                          ))}
                          <span className="text-xs text-stone-400 ml-auto">
                            {lead.postedAt ? new Date(lead.postedAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                      <div className={`shrink-0 text-sm font-bold px-3 py-1 ${
                        lead.score >= 0.7 ? "bg-emerald-100 text-emerald-700" :
                        lead.score >= 0.5 ? "bg-amber-100 text-amber-700" :
                        "bg-stone-100 text-stone-600"
                      }`}>
                        {(lead.score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {(!jobs || jobs.length === 0) ? (
            <div className="text-center py-12 text-stone-500 border border-stone-200 border-dashed">No scraping jobs yet</div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <Card key={job.id} className="border-stone-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">Job #{job.id}</p>
                        <p className="text-xs text-stone-500">
                          {job.channelsScraped?.join(", ") || "N/A"} &middot;
                          Started: {new Date(job.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={
                          job.status === "completed" ? STATUS_COLORS.completed :
                          job.status === "running" ? STATUS_COLORS.active :
                          job.status === "failed" ? "bg-red-100 text-red-700" :
                          STATUS_COLORS.draft
                        }>
                          {job.status}
                        </Badge>
                        {job.leadsFound !== undefined && (
                          <span className="text-sm">{job.leadsFound} leads</span>
                        )}
                        {job.avgScore !== undefined && job.avgScore !== null && (
                          <span className="text-sm font-medium">Avg: {(job.avgScore * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedLeadData?.displayName || selectedLeadData?.username}
              <Badge variant="outline" className="capitalize">{selectedLeadData?.source}</Badge>
              <span className={`text-sm font-bold px-2 py-0.5 ${
                (selectedLeadData?.score || 0) >= 0.7 ? "bg-emerald-100 text-emerald-700" :
                (selectedLeadData?.score || 0) >= 0.5 ? "bg-amber-100 text-amber-700" :
                "bg-stone-100 text-stone-600"
              }`}>
                {((selectedLeadData?.score || 0) * 100).toFixed(0)}% match
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Lead details and contact information
            </DialogDescription>
          </DialogHeader>
          {selectedLeadData && (
            <div className="space-y-4">
              {selectedLeadData.title && (
                <div>
                  <p className="text-sm font-medium text-stone-500">Title</p>
                  <p className="text-sm">{selectedLeadData.title}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-stone-500">Content</p>
                <p className="text-sm mt-1 p-3 bg-stone-50 border border-stone-200">{selectedLeadData.content}</p>
              </div>

              {!!selectedLeadData.metadata?.scoreBreakdown && (
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-2">AI Score Breakdown</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedLeadData.metadata.scoreBreakdown as Record<string, number>).map(([key, val]: [string, number]) => (
                      <div key={key} className="flex justify-between p-2 bg-stone-50 border border-stone-200">
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-medium">{(val * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-stone-500">Source</p>
                  <a href={selectedLeadData.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-stone-900 hover:underline">
                    View Post <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {selectedLeadData.profileUrl && (
                  <div>
                    <p className="text-stone-500">Profile</p>
                    <a href={selectedLeadData.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-stone-900 hover:underline">
                      View Profile <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {selectedLeadData.postedAt && (
                  <div>
                    <p className="text-stone-500">Posted</p>
                    <p>{new Date(selectedLeadData.postedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedLeadData.contactInfo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {selectedLeadData.contactInfo.email && (
                    <div><p className="text-stone-500">Email</p><p>{selectedLeadData.contactInfo.email}</p></div>
                  )}
                  {selectedLeadData.contactInfo.phone && (
                    <div><p className="text-stone-500">Phone</p><p>{selectedLeadData.contactInfo.phone}</p></div>
                  )}
                  {selectedLeadData.contactInfo.website && (
                    <div><p className="text-stone-500">Website</p><a href={selectedLeadData.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-stone-900 hover:underline">{selectedLeadData.contactInfo.website}</a></div>
                  )}
                  {selectedLeadData.contactInfo.location && (
                    <div><p className="text-stone-500">Location</p><p>{selectedLeadData.contactInfo.location}</p></div>
                  )}
                </div>
              )}

              {selectedLeadData.engagementMetrics && (
                <div className="flex gap-4 text-sm bg-stone-50 p-3 border border-stone-200">
                  {selectedLeadData.engagementMetrics.upvotes !== undefined && (
                    <span>Upvotes: <strong>{selectedLeadData.engagementMetrics.upvotes}</strong></span>
                  )}
                  {selectedLeadData.engagementMetrics.replies !== undefined && (
                    <span>Replies: <strong>{selectedLeadData.engagementMetrics.replies}</strong></span>
                  )}
                  {selectedLeadData.engagementMetrics.views !== undefined && (
                    <span>Views: <strong>{selectedLeadData.engagementMetrics.views.toLocaleString()}</strong></span>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-stone-500 mb-1">Notes</p>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this lead..." className="rounded-none border-stone-200" />
                <Button size="sm" className="mt-2 bg-stone-900 text-stone-50 hover:bg-stone-800 rounded-none" onClick={() => { if (selectedLead) updateNotes.mutate({ id: selectedLead, notes }); }}>
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
