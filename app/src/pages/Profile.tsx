import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { User, Mail, Image, Shield, Zap, Trophy, Flame, Award, Gift, Copy, Key } from "lucide-react";

export default function Profile() {
  usePageTitle("Profile");
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: plan } = trpc.billing.getPlan.useQuery();
  const { data: gamification } = trpc.gamification.me.useQuery();
  const { data: referralStats } = trpc.auth.getReferrals.useQuery();
  const { data: apiKeyData } = trpc.auth.getApiKey.useQuery();
  const generateApiKey = trpc.auth.generateApiKey.useMutation({
    onSuccess: () => {
      toast.success("New API key generated!");
      utils.auth.getApiKey.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleProfileUpdate = () => {
    updateProfile.mutate({
      name: profileForm.name || undefined,
      email: profileForm.email || undefined,
      avatar: profileForm.avatar || undefined,
    });
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePassword.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const usagePercent = plan && plan.limit !== Infinity
    ? Math.min(100, (plan.usage / plan.limit) * 100)
    : 0;

  const periodLabel = plan?.period === "month" ? "this month" : "today";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileForm.avatar || undefined} />
              <AvatarFallback className="text-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                {(profileForm.name || user?.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.username}</p>
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <User className="h-3 w-3" /> Display Name
            </Label>
            <Input
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Image className="h-3 w-3" /> Avatar URL
            </Label>
            <Input
              value={profileForm.avatar}
              onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <Button
            onClick={handleProfileUpdate}
            disabled={updateProfile.isPending}
            className="bg-gradient-to-r from-indigo-500 to-violet-600"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Gamification Card */}
      {gamification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Gamification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Level {gamification.level}</span>
              </div>
              <span className="text-sm text-muted-foreground">{gamification.levelName}</span>
            </div>
            <Progress value={(gamification.progress || 0) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {gamification.totalPoints.toLocaleString()} / {gamification.nextLevelThreshold.toLocaleString()} points to next level
            </p>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Trophy className="h-4 w-4 mx-auto mb-1 text-indigo-500" />
                <p className="text-lg font-bold">{gamification.totalPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-lg font-bold">{gamification.currentStreak}d</p>
                <p className="text-xs text-muted-foreground">Streak</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Award className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-lg font-bold">{gamification.badges.length}</p>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
            </div>

            {gamification.earnedBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {gamification.earnedBadges.map((badge: any) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium"
                  >
                    <Award className="h-3 w-3" />
                    {badge.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{plan?.planName || "Free"}</span>
            <span className="text-sm text-muted-foreground">
              {plan?.limit === Infinity ? "Unlimited" : `${plan?.limit} scrapes/${plan?.period === "month" ? "mo" : "day"}`}
            </span>
          </div>
          {plan && plan.limit !== Infinity && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage {periodLabel}</span>
                <span className="font-medium">{plan.usage} / {plan.limit}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" /> Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralStats?.referralCode ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Referral Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/register?ref=${referralStats.referralCode}`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referralStats.referralCode}`);
                      toast.success("Referral link copied!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link. When someone signs up, you both get <strong>50 free credits</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
                  <p className="text-xs text-muted-foreground">Friends joined</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{referralStats.totalEarned}</p>
                  <p className="text-xs text-muted-foreground">Credits earned</p>
                </div>
              </div>

              {referralStats.referrals.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Recent Referrals</Label>
                  <div className="space-y-1">
                    {referralStats.referrals.slice(0, 5).map((ref, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="truncate">{ref.referredName || "Anonymous"}</span>
                        <span className="text-emerald-600 font-medium text-xs">+{ref.creditsAwarded} credits</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Your referral code is being generated...</p>
          )}
        </CardContent>
      </Card>

      {/* API Key Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use your API key to access LeadIntel AI programmatically.
          </p>
          {apiKeyData?.apiKey ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input readOnly value={apiKeyData.apiKey} className="text-xs font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (apiKeyData?.apiKey) {
                      navigator.clipboard.writeText(apiKeyData.apiKey);
                      toast.success("API key copied!");
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Authorization: Bearer {apiKeyData.apiKey.slice(0, 16)}...
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No API key generated yet.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateApiKey.mutate()}
            disabled={generateApiKey.isPending}
          >
            {generateApiKey.isPending ? "Generating..." : apiKeyData?.apiKey ? "Regenerate API Key" : "Generate API Key"}
          </Button>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Repeat new password"
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={changePassword.isPending}
            variant="outline"
          >
            {changePassword.isPending ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
