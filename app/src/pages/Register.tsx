import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Zap, Gift } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") ?? undefined;

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created! Welcome aboard.");
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    register.mutate({
      username: form.username,
      name: form.name,
      email: form.email,
      password: form.password,
      referralCode: refCode,
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 py-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-10 w-10 bg-stone-900">
            <Zap className="h-5 w-5 text-stone-50" />
          </div>
          <h1 className="text-xl font-serif font-medium tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Create Account
          </h1>
          <p className="text-sm text-stone-500">Start scraping leads for free</p>
          {refCode && (
            <div className="flex items-center justify-center gap-2 text-sm text-stone-700 bg-stone-200 rounded-none px-3 py-2">
              <Gift className="h-4 w-4" />
              <span>
                Referral code <strong>{refCode}</strong> applied — you both get 50 free credits!
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Choose a username"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Full Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Confirm Password</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repeat password"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={register.isPending}
            className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800 font-medium h-11 rounded-none"
          >
            {register.isPending ? "Creating account..." : "Create Account"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <p className="text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link to="/login" className="text-stone-900 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
