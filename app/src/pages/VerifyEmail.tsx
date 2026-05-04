import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => setStatus("success"),
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setStatus("error");
      setErrorMsg("No verification token found in the URL.");
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative w-full max-w-sm text-center space-y-6 py-12">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
            <h1 className="text-2xl font-bold">Verifying your email...</h1>
            <p className="text-zinc-500">Just a moment while we confirm your address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold">Email verified!</h1>
            <p className="text-zinc-500">Your email has been successfully verified. You're all set.</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="text-zinc-500">{errorMsg}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/login">Back to Login</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
