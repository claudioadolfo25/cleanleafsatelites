import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
        return;
      }
      throw error;
    }
  }, [logoutMutation]);

  const state = useMemo(() => {
    if (meQuery.isLoading) {
      return {
        user: null,
        loading: true,
        error: null,
        isAuthenticated: false,
      };
    }

    if (meQuery.error) {
      return {
        user: null,
        loading: false,
        error: meQuery.error,
        isAuthenticated: false,
      };
    }

    if (meQuery.data) {
      return {
        user: meQuery.data,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    return {
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
    };
  }, [meQuery.isLoading, meQuery.error, meQuery.data]);

  useEffect(() => {
    if (!state.loading && !state.isAuthenticated && redirectOnUnauthenticated) {
      startLogin();
    }
  }, [state.loading, state.isAuthenticated, redirectOnUnauthenticated]);

  return {
    ...state,
    logout,
  };
}
