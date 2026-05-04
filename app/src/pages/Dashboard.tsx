import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Users, Star, Zap, TrendingUp, ArrowRight, BarChart3, Crown } from "lucide-react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const { data: stats } = trpc.lead.stats.useQuery();
  const { data: campaigns } = trpc.campaign.list.useQuery();
  const { data: recentLeads } = trpc.lead.list.useQuery({ limit: 5, offset: 0 });
  const { data: plan } = trpc.billing.getPlan.useQuery();

  const activeCampaigns = campaigns?.filter(c => c.status === "active") || [];
  const topSources = stats?.bySource?.sort((a, b) => b.count - a.count).slice(0, 5) || [];
  const isFree = plan?.planId === "free";
  const usagePercent = plan && plan.limit !== Infinity
    ? Math.min(100, (plan.usage / plan.limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">Overview of your lead intelligence activity</p>
        </div>
        <Button onClick={() => navigate("/campaigns?create=1")} className="bg-stone-900 text-stone-50 hover:bg-stone-800 shrink-0">
          <Zap className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* Free user upgrade CTA */}
      {isFree && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 text-sm">You're on the Free plan</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {plan.remaining} of {plan.limit} monthly scrapes remaining.
                    Upgrade to Starter for 50 scrapes/day and advanced AI scoring.
                  </p>
                  <div className="mt-2 w-full max-w-xs">
                    <Progress value={usagePercent} className="h-1.5" />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate("/billing")}
                className="bg-stone-900 text-stone-50 hover:bg-stone-800 shrink-0"
                size="sm"
              >
                Upgrade <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-stone-900 border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-stone-500 flex items-center gap-2 uppercase tracking-wider">
              <Users className="h-4 w-4" /> Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-stone-500 mt-1">{stats?.recentLeads || 0} new this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-stone-500 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" /> Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.avgScore ? (stats.avgScore * 100).toFixed(0) : 0}%</div>
            <Progress value={(stats?.avgScore || 0) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-stone-500 flex items-center gap-2 uppercase tracking-wider">
              <Star className="h-4 w-4" /> Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{stats?.favoriteCount || 0}</div>
            <p className="text-xs text-stone-500 mt-1">Saved leads</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-stone-600 border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-stone-500 flex items-center gap-2 uppercase tracking-wider">
              <Target className="h-4 w-4" /> Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-stone-500 mt-1">of {campaigns?.length || 0} total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top Sources */}
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-stone-500" /> Leads by Source
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leads")} className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {topSources.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-sm">
                No leads yet. Start a campaign to discover leads.
              </div>
            ) : (
              <div className="space-y-3">
                {topSources.map((src) => (
                  <div key={src.source} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20 sm:w-28 capitalize truncate">{src.source}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-stone-900 transition-all"
                          style={{ width: `${Math.max(5, (src.count / (stats?.totalLeads || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{src.count}</span>
                    <span className="text-xs text-stone-400 w-10 text-right">
                      {((src.avgScore || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-stone-500" /> Top Scored Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentLeads?.leads || recentLeads.leads.length === 0) ? (
              <div className="text-center py-8 text-stone-500 text-sm">
                No leads yet. Run a campaign to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-start gap-3 p-2 hover:bg-stone-50 cursor-pointer transition-colors border border-transparent hover:border-stone-200"
                    onClick={() => navigate(`/campaigns/${lead.campaignId}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.displayName || lead.username}</p>
                      <p className="text-xs text-stone-500 truncate capitalize">{lead.source}</p>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-0.5 ${
                      lead.score >= 0.7 ? "bg-emerald-100 text-emerald-700" :
                      lead.score >= 0.5 ? "bg-amber-100 text-amber-700" :
                      "bg-stone-100 text-stone-600"
                    }`}>
                      {(lead.score * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:border-stone-400 transition-colors cursor-pointer border-stone-200" onClick={() => navigate("/campaigns")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-stone-100 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <p className="font-medium text-sm">Manage Campaigns</p>
              <p className="text-xs text-stone-500">View and edit your scraping campaigns</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-stone-400 transition-colors cursor-pointer border-stone-200" onClick={() => navigate("/leads")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-stone-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <p className="font-medium text-sm">Browse Leads</p>
              <p className="text-xs text-stone-500">Filter, score, and export leads</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-stone-400 transition-colors cursor-pointer border-stone-200" onClick={() => navigate("/visitors")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-stone-100 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <p className="font-medium text-sm">Visitors</p>
              <p className="text-xs text-stone-500">Track website visitor identification</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
