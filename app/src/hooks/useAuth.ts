import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";

export type AuthUser = {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string;
  mustChangePassword: boolean;
  emailVerified: boolean;
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/login");
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.mustChangePassword && window.location.pathname !== "/change-password") {
        navigate("/change-password");
      }
    }
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        navigate("/login");
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate]);

  return useMemo(
    () => ({
      user: (user as AuthUser | undefined) ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      isAdmin: user?.role === "admin",
      emailVerified: user?.emailVerified ?? false,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, error, logout, refetch]
  );
}
