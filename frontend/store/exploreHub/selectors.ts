import { ExploreHubState } from './types';

export const exploreHubSelectors = {
  unreadMessages: (state: ExploreHubState) => state.messages.reduce((acc, item) => acc + item.unreadCount, 0),
  unreadNotifications: (state: ExploreHubState) => state.notifications.filter((item) => !item.isRead).length,
  isStale: (state: ExploreHubState, now = Date.now()) => {
    if (!state.staleAt) return true;
    return now >= state.staleAt;
  },
  isReady: (state: ExploreHubState) => state.status === 'success' || state.status === 'empty',
};
