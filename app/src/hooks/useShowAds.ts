import { trpc } from "@/providers/trpc";

export function useShowAds(): boolean {
  const { data: plan } = trpc.billing.getPlan.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Show ads for free users or if plan info is not loaded yet (treat as free)
  if (!plan) return true;
  return plan.planId === "free";
}
