import { useEffect, useMemo } from 'react';
import { exploreHubSelectors } from '@/store/exploreHub/selectors';
import { useExploreHubStore } from '@/store/exploreHub/context';

export function useExploreHub() {
  const { state, load, refresh, invalidate, markNotificationAsRead, markThreadAsRead } = useExploreHubStore();

  useEffect(() => {
    const shouldAutoLoad =
      state.status === 'idle' ||
      ((state.status === 'success' || state.status === 'empty') && exploreHubSelectors.isStale(state));

    if (shouldAutoLoad) {
      void load(false);
    }
  }, [state.status, state.staleAt, load]);

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
    load,
    refresh,
    invalidate,
    markNotificationAsRead,
    markThreadAsRead,
  };
}
