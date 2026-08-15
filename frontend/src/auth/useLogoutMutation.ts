import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { appPersister } from "../queryClient";
import { AUTH_QUERY_KEY } from "./AuthContext";

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // setQueryData first, synchronously flipping isAuthenticated to false
      // so ProtectedRoute redirects immediately — queryClient.clear() alone
      // was tried here and, empirically, left the already-mounted auth
      // query observer not picking up the change (the dashboard kept
      // rendering as "logged in" until a manual reload); removeQueries
      // below only touches the *other* cached data, not this query.
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      // Drop everything else — leftover wells/rigs/etc. data in the cache
      // would otherwise be briefly visible to whichever user logs in next
      // on this browser.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      // The persister's own persist-on-change subscription is throttled
      // (~1s), so a logout immediately followed by a hard navigation (e.g.
      // typing a URL, not just clicking a link) can otherwise still read
      // back a stale, still-authenticated snapshot from localStorage.
      // Removing it here is synchronous instead of racing that throttle.
      void appPersister.removeClient();
    },
  });
}
