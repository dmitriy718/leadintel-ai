import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Trophy, Medal, Award } from "lucide-react";

export default function Leaderboard() {
  usePageTitle("Leaderboard");
  const { data: leaders, isLoading } = trpc.gamification.leaderboard.useQuery();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-amber-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-zinc-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Top scrapers this month</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !leaders?.length ? (
        <div className="text-center py-12 text-muted-foreground">No leaders yet. Start scraping to climb the ranks!</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 text-xs text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">User</div>
            <div className="col-span-2 text-center">Level</div>
            <div className="col-span-2 text-center">Streak</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          {leaders.map((leader, i) => (
            <div
              key={leader.username}
              className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-1 flex items-center">{getRankIcon(i)}</div>
              <div className="col-span-5">
                <p className="font-medium">{leader.name || leader.username}</p>
                <p className="text-xs text-muted-foreground">@{leader.username}</p>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-sm font-medium">Lv.{leader.level}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-sm">{leader.currentStreak}d</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-bold">{leader.totalPoints.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
