import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, CreditCard, Check, Coins } from "lucide-react";

const PLANS = [
  { id: "free", name: "Free", monthlyPrice: "$0", annualPrice: "$0", scrapes: "150/mo", overage: "$2" },
  { id: "starter", name: "Starter", monthlyPrice: "$29", annualPrice: "$290", scrapes: "50/day", overage: "$1" },
  { id: "pro", name: "Pro", monthlyPrice: "$79", annualPrice: "$790", scrapes: "200/day", overage: "$0.50" },
  { id: "enterprise", name: "Enterprise", monthlyPrice: "$199", annualPrice: "$1,990", scrapes: "Unlimited", overage: "—" },
];

const CREDIT_PACKS = [
  { id: "creditsSmall", credits: 50, price: "$9", label: "50 Credits" },
  { id: "creditsMedium", credits: 200, price: "$29", label: "200 Credits", popular: true },
];

export default function Billing() {
  usePageTitle("Billing");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const { data: plan } = trpc.billing.getPlan.useQuery();
  const { data: priceIds } = trpc.billing.getPriceIds.useQuery();

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const usagePercent = plan && plan.limit !== Infinity
    ? Math.min(100, (plan.usage / plan.limit) * 100)
    : 0;

  const periodLabel = plan?.period === "month" ? "this month" : "today";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your plan, usage, and credits</p>
      </div>

      {/* Current Plan + Credits Card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold">{plan?.planName ?? "Free"}</p>
            </div>
          </div>
          {plan?.planId !== "free" && (
            <Button variant="outline" size="sm" onClick={() => createPortal.mutate()}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          )}
        </div>

        {plan && plan.limit !== Infinity && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Usage {periodLabel}</span>
              <span className="font-medium">{plan.usage} / {plan.limit} scrapes</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {plan.remaining} remaining {periodLabel}
            </p>
          </div>
        )}

        {plan?.planId === "enterprise" && (
          <p className="text-sm text-emerald-600 font-medium">Unlimited scrapes active</p>
        )}

        {/* Credits Balance */}
        {(plan?.creditsBalance ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <Coins className="h-4 w-4" />
            <span className="font-medium">{plan?.creditsBalance} scrape credits</span>
            <span className="text-muted-foreground">available — used when you hit your plan limit</span>
          </div>
        )}
      </div>

      {/* Interval Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setInterval("month")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === "month"
              ? "bg-indigo-500 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:bg-zinc-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("year")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            interval === "year"
              ? "bg-indigo-500 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:bg-zinc-200"
          }`}
        >
          Annual
          <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">Save 17%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((p) => {
          const isCurrent = plan?.planId === p.id;
          const price = interval === "year" ? p.annualPrice : p.monthlyPrice;
          const period = interval === "year" ? "/yr" : "/mo";
          const priceKey = interval === "year" ? `${p.id}Annual` : p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-5 ${
                isCurrent ? "border-indigo-500/50 bg-indigo-50/5" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{p.name}</h3>
                {isCurrent && (
                  <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <div className="text-2xl font-bold mb-1">
                {price}<span className="text-sm font-normal text-muted-foreground">{period}</span>
              </div>
              {interval === "year" && p.id !== "free" && (
                <p className="text-xs text-emerald-600 font-medium mb-2">2 months free</p>
              )}
              <ul className="space-y-2 mt-4 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {p.scrapes} leads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {p.overage} per extra scrape
                </li>
              </ul>
              {!isCurrent && p.id !== "free" && (
                <Button
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => {
                    const priceId = priceIds?.[priceKey as keyof typeof priceIds];
                    if (priceId) {
                      createCheckout.mutate({ priceId, mode: "subscription" });
                    } else {
                      toast.error("Stripe price ID not configured for this plan");
                    }
                  }}
                  disabled={createCheckout.isPending}
                >
                  Upgrade
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-up Credits */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Need more scrapes?</h2>
        <p className="text-sm text-muted-foreground">
          Buy credit packs that never expire. Credits are automatically used when you hit your plan limit.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-md">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-xl border p-5 bg-card ${pack.popular ? "border-amber-500/50" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{pack.label}</h3>
                {pack.popular && (
                  <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">Best value</span>
                )}
              </div>
              <div className="text-2xl font-bold mb-3">{pack.price}</div>
              <p className="text-xs text-muted-foreground mb-4">One-time purchase. Credits never expire.</p>
              <Button
                className="w-full"
                size="sm"
                variant={pack.popular ? "default" : "outline"}
                onClick={() => {
                  const priceId = priceIds?.[pack.id as keyof typeof priceIds];
                  if (priceId) {
                    createCheckout.mutate({ priceId, mode: "payment" });
                  } else {
                    toast.error("Stripe price ID not configured for credits");
                  }
                }}
                disabled={createCheckout.isPending}
              >
                <Coins className="h-4 w-4 mr-2" />
                Buy Credits
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
