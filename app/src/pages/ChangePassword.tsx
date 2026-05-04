import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Lock, ArrowRight, ShieldAlert } from "lucide-react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error("Password must contain uppercase, lowercase, and a number");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Change Password</h1>
          <p className="text-sm text-zinc-500">For security, please update your password before continuing</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pl-10 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={changePassword.isPending}
            className="w-full bg-white text-black hover:bg-zinc-200 font-medium h-11"
          >
            {changePassword.isPending ? "Updating..." : "Update Password"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
