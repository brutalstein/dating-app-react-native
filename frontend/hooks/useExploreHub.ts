import { useEffect, useMemo } from 'react';
import { exploreHubSelectors } from '@/store/exploreHub/selectors';
import { useExploreHubStore } from '@/store/exploreHub/context';

export function useExploreHub() {
  const { state, load, refresh, invalidate, markNotificationAsRead, markThreadAsRead } = useExploreHubStore();

  useEffect(() => {
    if (state.status === 'idle' || exploreHubSelectors.isStale(state)) {
      load();
    }
  }, [state, load]);

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
