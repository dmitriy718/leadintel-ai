import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Download, ExternalLink, Search, Filter, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackoverflow: "Stack Overflow",
  github: "GitHub",
  twitter: "Twitter",
  quora: "Quora",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  googlemaps: "Google Maps",
};

function escapeCSVCell(val: string): string {
  const sanitized = val.replace(/\r?\n/g, " ").replace(/\t/g, " ").replace(/"/g, '""');
  return `"${sanitized}"`;
}

export default function Leads() {
  usePageTitle("Leads");
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: leadsData, isLoading } = trpc.lead.list.useQuery({
    source: sourceFilter || undefined,
    minScore: minScore ? Number(minScore) : undefined,
    isFavorite: showFavoritesOnly || undefined,
    search: search || undefined,
    limit: 100,
    offset: 0,
  });

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

  const sortedLeads = useMemo(() => {
    if (!leadsData?.leads) return [];
    const sorted = [...leadsData.leads];
    if (sortBy === "score") {
      sorted.sort((a, b) => b.score - a.score);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [leadsData, sortBy]);

  const exportCSV = () => {
    if (!leadsData?.leads.length) return;
    const headers = ["Name", "Source", "Score", "Keywords", "Content", "URL", "Posted Date", "Notes"];
    const rows = leadsData.leads.map(l => [
      escapeCSVCell(l.displayName || l.username || ""),
      escapeCSVCell(l.source),
      escapeCSVCell((l.score * 100).toFixed(0) + "%"),
      escapeCSVCell((l.keywordMatches || []).join("; ")),
      escapeCSVCell(l.content.substring(0, 500)),
      escapeCSVCell(l.sourceUrl),
      escapeCSVCell(l.postedAt ? new Date(l.postedAt).toISOString() : ""),
      escapeCSVCell(l.notes || ""),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-stone-500 text-sm mt-1">Browse and manage all your discovered leads</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!leadsData?.leads.length} className="shrink-0 border-stone-200">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input className="pl-9 rounded-none border-stone-200" placeholder="Search leads..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px] sm:w-[160px] rounded-none border-stone-200">
            <Filter className="h-4 w-4 mr-1 text-stone-500" />
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minScore} onValueChange={setMinScore}>
          <SelectTrigger className="w-[120px] sm:w-[140px] rounded-none border-stone-200">
            <ArrowUpDown className="h-4 w-4 mr-1 text-stone-500" />
            <SelectValue placeholder="Min Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any Score</SelectItem>
            <SelectItem value="0.7">70%+</SelectItem>
            <SelectItem value="0.5">50%+</SelectItem>
            <SelectItem value="0.3">30%+</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={showFavoritesOnly ? "bg-stone-900 text-stone-50" : "border-stone-200"}
        >
          <Star className={`h-4 w-4 ${showFavoritesOnly ? "fill-stone-50" : ""}`} />
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-sm text-stone-500">
          {leadsData?.total || 0} leads found
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant={sortBy === "score" ? "default" : "outline"} onClick={() => setSortBy("score")} className={sortBy === "score" ? "bg-stone-900 text-stone-50" : "border-stone-200"}>
            Best Match
          </Button>
          <Button size="sm" variant={sortBy === "date" ? "default" : "outline"} onClick={() => setSortBy("date")} className={sortBy === "date" ? "bg-stone-900 text-stone-50" : "border-stone-200"}>
            Newest
          </Button>
        </div>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="text-center py-12 text-stone-500">Loading leads...</div>
      ) : sortedLeads.length === 0 ? (
        <div className="text-center py-12 text-stone-500 border border-stone-200 border-dashed">
          No leads match your filters. Try adjusting your search criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLeads.map(lead => (
            <Card key={lead.id} className="border-stone-200 hover:border-stone-400 transition-colors cursor-pointer" onClick={() => { setSelectedLead(lead.id); setNotes(lead.notes || ""); }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-sm">{lead.displayName || lead.username}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </Badge>
                      {lead.isFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      {lead.contactInfo?.email && (
                        <Badge variant="secondary" className="text-xs bg-stone-100 text-stone-600">Has Email</Badge>
                      )}
                      {lead.contactInfo?.phone && (
                        <Badge variant="secondary" className="text-xs bg-stone-100 text-stone-600">Has Phone</Badge>
                      )}
                    </div>
                    {lead.title && <p className="text-sm font-medium mt-1 truncate">{lead.title}</p>}
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">{lead.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {lead.keywordMatches?.slice(0, 5).map(k => (
                        <span key={k} className="text-xs px-1.5 py-0.5 border border-stone-200 text-stone-600">{k}</span>
                      ))}
                      <span className="text-xs text-stone-400 ml-auto">
                        {lead.postedAt ? new Date(lead.postedAt).toLocaleDateString() : new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className={`text-sm font-bold px-3 py-1 ${
                      lead.score >= 0.7 ? "bg-emerald-100 text-emerald-700" :
                      lead.score >= 0.5 ? "bg-amber-100 text-amber-700" :
                      "bg-stone-100 text-stone-600"
                    }`}>
                      {(lead.score * 100).toFixed(0)}%
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate({ id: lead.id }); }}
                      className="p-1 hover:bg-stone-100"
                    >
                      <Star className={`h-4 w-4 ${lead.isFavorite ? "fill-amber-400 text-amber-400" : "text-stone-400"}`} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                <p className="text-sm mt-1 p-3 bg-stone-50 border border-stone-200 whitespace-pre-wrap">{selectedLeadData.content}</p>
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
                  <p className="text-stone-500">Source URL</p>
                  <a href={selectedLeadData.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-stone-900 hover:underline truncate">
                    View Post <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                {selectedLeadData.profileUrl && (
                  <div>
                    <p className="text-stone-500">Profile</p>
                    <a href={selectedLeadData.profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-stone-900 hover:underline truncate">
                      View Profile <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                {selectedLeadData.contactInfo && (
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-stone-500">Contact Info</p>
                    {selectedLeadData.contactInfo.email && <p>{selectedLeadData.contactInfo.email}</p>}
                    {selectedLeadData.contactInfo.phone && <p>{selectedLeadData.contactInfo.phone}</p>}
                    {selectedLeadData.contactInfo.website && (
                      <a href={selectedLeadData.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-stone-900 hover:underline">
                        {selectedLeadData.contactInfo.website}
                      </a>
                    )}
                    {selectedLeadData.contactInfo.location && <p>{selectedLeadData.contactInfo.location}</p>}
                  </div>
                )}
              </div>

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
