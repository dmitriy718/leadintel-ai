import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Zap } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success("Welcome back!");
      if (data.user.mustChangePassword) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-10 w-10 bg-stone-900">
            <Zap className="h-5 w-5 text-stone-50" />
          </div>
          <h1 className="text-xl font-serif font-medium tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            LeadIntel AI
          </h1>
          <p className="text-sm text-stone-500">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-stone-500 text-xs uppercase tracking-wider">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-stone-900/10 rounded-none"
            />
          </div>

          <Button
            onClick={() => login.mutate({ username, password })}
            disabled={login.isPending}
            className="w-full bg-stone-900 text-stone-50 hover:bg-stone-800 font-medium h-11 rounded-none"
          >
            {login.isPending ? "Signing in..." : "Sign In"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <p className="text-center text-sm text-stone-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-stone-900 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
