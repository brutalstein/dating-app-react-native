import { useEffect, useMemo, useRef } from 'react';
import { exploreHubSelectors } from '@/store/exploreHub/selectors';
import { useExploreHubStore } from '@/store/exploreHub/context';
import { useAuthSession } from '@/hooks/useAuthSession';

export function useExploreHub() {
  const { state, load, refresh, invalidate, markNotificationAsRead, markThreadAsRead } = useExploreHubStore();
  const { ready, authenticated } = useAuthSession();
  const previousAuthRef = useRef(authenticated);

  useEffect(() => {
    const didJustAuthenticate = ready && authenticated && !previousAuthRef.current;

    if (!ready || !authenticated) {
      previousAuthRef.current = authenticated;
      return;
    }

    const shouldAutoLoad =
      didJustAuthenticate ||
      state.status === 'idle' ||
      state.status === 'error' ||
      ((state.status === 'success' || state.status === 'empty') && exploreHubSelectors.isStale(state));

    if (shouldAutoLoad) {
      void load(didJustAuthenticate);
    }

    previousAuthRef.current = authenticated;
  }, [ready, authenticated, state.status, state.staleAt, load]);

  const counts = useMemo(
    () => ({
      unreadMessages: exploreHubSelectors.unreadMessages(state),
      unreadNotifications: exploreHubSelectors.unreadNotifications(state),
    }),
    [state]
  );

  return {
    status: state.status,
    error: state.error,
    messages: state.messages,
    notifications: state.notifications,
    activities: state.activities,
    isRefreshing: state.isRefreshing,
    counts,
    authReady: ready,
    authenticated,
    load,
    refresh,
    invalidate,
    markNotificationAsRead,
    markThreadAsRead,
  };
}
