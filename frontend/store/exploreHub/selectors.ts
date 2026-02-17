import { ExploreHubState } from './types';

export const exploreHubSelectors = {
  unreadMessages: (state: ExploreHubState) => state.unreadMessages,
  unreadNotifications: (state: ExploreHubState) => state.unreadNotifications,
  isStale: (state: ExploreHubState, now = Date.now()) => {
    if (!state.staleAt) return true;
    return now >= state.staleAt;
  },
  isReady: (state: ExploreHubState) => state.status === 'success' || state.status === 'empty',
};
