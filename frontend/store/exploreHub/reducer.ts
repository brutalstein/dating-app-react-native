import { ExploreHubAction, ExploreHubState } from './types';

const initialState: ExploreHubState = {
  status: 'idle',
  error: null,
  isRefreshing: false,
  lastFetchedAt: null,
  staleAt: null,
  messages: [],
  notifications: [],
  activities: [],
  unreadMessages: 0,
  unreadNotifications: 0,
};

function resolveStatus(next: Pick<ExploreHubState, 'messages' | 'notifications' | 'activities'>): 'success' | 'empty' {
  const isEmpty = next.messages.length === 0 && next.notifications.length === 0 && next.activities.length === 0;
  return isEmpty ? 'empty' : 'success';
}

export function exploreHubReducer(state: ExploreHubState, action: ExploreHubAction): ExploreHubState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        status: state.lastFetchedAt && action.payload.refreshing ? state.status : 'loading',
        isRefreshing: action.payload.refreshing,
        error: null,
      };

    case 'LOAD_SUCCESS': {
      const { data, fetchedAt, staleAt } = action.payload;
      return {
        ...state,
        ...data,
        unreadMessages: data.unreadMessages ?? data.messages.reduce((acc, m) => acc + m.unreadCount, 0),
        unreadNotifications: data.unreadNotifications ?? data.notifications.filter((n) => !n.isRead).length,
        status: resolveStatus(data),
        error: null,
        isRefreshing: false,
        lastFetchedAt: fetchedAt,
        staleAt,
      };
    }

    case 'LOAD_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
        isRefreshing: false,
      };

    case 'MARK_THREAD_READ_OPTIMISTIC':
      return {
        ...state,
        messages: state.messages.map((item) => (item.id === action.payload.id ? { ...item, unreadCount: 0 } : item)),
        unreadMessages: Math.max(0, state.messages.filter((m) => m.id === action.payload.id).reduce((a, m) => a + m.unreadCount, 0) ? state.unreadMessages - state.messages.filter((m) => m.id === action.payload.id).reduce((a, m) => a + m.unreadCount, 0) : state.unreadMessages),
      };

    case 'MARK_THREAD_READ_ROLLBACK':
      return {
        ...state,
        messages: action.payload.snapshot,
      };

    case 'MARK_NOTIFICATION_READ_OPTIMISTIC':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.payload.id ? { ...item, isRead: true } : item
        ),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1),
      };

    case 'MARK_NOTIFICATION_READ_ROLLBACK':
      return {
        ...state,
        notifications: action.payload.snapshot,
      };

    case 'APPLY_REALTIME_PAYLOAD': {
      const data = action.payload.data;
      return {
        ...state,
        ...data,
        unreadMessages: data.unreadMessages ?? data.messages.reduce((acc, m) => acc + m.unreadCount, 0),
        unreadNotifications: data.unreadNotifications ?? data.notifications.filter((n) => !n.isRead).length,
        status: resolveStatus(data),
      };
    }

    case 'INVALIDATE_CACHE':
      return {
        ...state,
        staleAt: 0,
      };

    default:
      return state;
  }
}

export { initialState as exploreHubInitialState };
