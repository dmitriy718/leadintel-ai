import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Target, Trash2, Play, Pause, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-stone-100 text-stone-600",
  completed: "bg-sky-100 text-sky-700",
};

export default function Campaigns() {
  usePageTitle("Campaigns");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const refCode = searchParams.get("create") === "1";
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery(undefined, {
    refetchOnMount: "always",
  });
  const { data: channels } = trpc.scrape.channels.useQuery();
  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      setCreateOpen(false);
      toast.success("Campaign created successfully!");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteCampaign = trpc.campaign.delete.useMutation({
    onSuccess: () => { utils.campaign.list.invalidate(); toast.success("Campaign deleted"); },
  });
  const updateCampaign = trpc.campaign.update.useMutation({
    onSuccess: () => { utils.campaign.list.invalidate(); toast.success("Campaign updated"); },
  });

  const [createOpen, setCreateOpen] = useState(() => refCode);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");

  const resetForm = () => {
    setName(""); setDescription(""); setKeywords(""); setSelectedChannels([]); setStatus("draft");
  };

  const handleCreate = () => {
    const kwList = keywords
      .split(/[,\n]+/)
      .map(k => k.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    const uniqueKeywords = [...new Set(kwList)];
    if (!name || uniqueKeywords.length === 0 || selectedChannels.length === 0) {
      toast.error("Please fill in name, keywords, and select at least one channel");
      return;
    }
    createCampaign.mutate({ name, description, keywords: uniqueKeywords, channels: selectedChannels, status });
  };

  const filtered = campaigns?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-stone-500 text-sm mt-1">Manage your lead scraping campaigns</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-stone-900 text-stone-50 hover:bg-stone-800 shrink-0">
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription className="sr-only">
                Fill out the details to create a new lead scraping campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Campaign Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Security Cam Prospects" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
              </div>
              <div>
                <Label>Keywords (comma-separated)</Label>
                <Textarea value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="security cam, system, local business" />
                <p className="text-xs text-stone-500 mt-1">These keywords will be searched across all selected channels</p>
              </div>
              <div>
                <Label>Channels</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {channels?.map(ch => (
                    <label key={ch.id} className="flex items-center gap-2 p-2 border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedChannels.includes(ch.id)}
                        onCheckedChange={(checked) => {
                          setSelectedChannels(prev =>
                            checked ? [...prev, ch.id] : prev.filter(id => id !== ch.id)
                          );
                        }}
                      />
                      <span className="text-sm">{ch.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: "draft" | "active" | "paused") => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createCampaign.isPending && (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-stone-100 overflow-hidden">
                    <div className="h-full w-full bg-stone-900 animate-pulse" />
                  </div>
                  <p className="text-xs text-stone-500 text-center">Creating campaign...</p>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={createCampaign.isPending}>
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <Input className="pl-9 rounded-none border-stone-200" placeholder="Search campaigns by name or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-stone-500">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500 border border-stone-200 border-dashed">
          {search ? "No campaigns match your search" : "No campaigns yet. Create your first campaign to get started!"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => (
            <Card key={campaign.id} className="border-stone-200 hover:border-stone-400 transition-colors cursor-pointer group" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 bg-stone-100 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-stone-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[campaign.status] || ""}`}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {campaign.keywords.slice(0, 4).map(k => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 border border-stone-200 text-stone-500">{k}</span>
                      ))}
                      {campaign.keywords.length > 4 && (
                        <span className="text-[10px] text-stone-400">+{campaign.keywords.length - 4}</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {campaign.channels.length} channels &middot; Last run: {" "}
                      {campaign.jobs?.[0]?.startedAt
                        ? new Date(campaign.jobs[0].startedAt).toLocaleDateString()
                        : campaign.lastRunAt
                          ? new Date(campaign.lastRunAt).toLocaleDateString()
                          : "Never"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                    {campaign.status === "active" ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateCampaign.mutate({ id: campaign.id, status: "paused" })}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateCampaign.mutate({ id: campaign.id, status: "active" })}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => {
                      if (confirm("Delete this campaign?")) deleteCampaign.mutate({ id: campaign.id });
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ExternalLink className="h-4 w-4 text-stone-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
