import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, X, Loader2 } from "lucide-react";

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: user } = trpc.auth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification email sent! Check your inbox.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (dismissed || !user || user.emailVerified) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Mail className="h-5 w-5 text-amber-700 shrink-0" />
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Verify your email</span> to unlock all features.
            We sent a link to <strong className="underline">{user.email}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-200 h-8"
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
          >
            {resend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resend"}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-900 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
