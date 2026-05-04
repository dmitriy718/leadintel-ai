import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Zap, DollarSign, TrendingUp } from "lucide-react";

export default function Admin() {
  usePageTitle("Admin");
  const { data: statsData } = trpc.admin.stats.useQuery();
  const { data: leaderboard } = trpc.gamification.leaderboard.useQuery();
  const { data: campaigns } = trpc.campaign.list.useQuery();

  const revenueDollars = statsData ? (statsData.revenueCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—";

  const stats = [
    { label: "Total Campaigns", value: statsData?.campaigns ?? 0, icon: Zap },
    { label: "Total Leads", value: statsData?.leads ?? 0, icon: Users },
    { label: "Total Users", value: statsData?.users ?? 0, icon: TrendingUp },
    { label: "Revenue", value: revenueDollars, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview and management</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <stat.icon className="h-4 w-4" />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Users</CardTitle>
          </CardHeader>
          <CardContent>
            {!leaderboard?.length ? (
              <p className="text-sm text-muted-foreground">No users yet</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((user, i) => (
                  <div key={user.username} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-sm font-medium">{user.name || user.username}</span>
                    </div>
                    <span className="text-sm">{user.totalPoints.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {!campaigns?.length ? (
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
