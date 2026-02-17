import { ActivityItem, ExploreHubPayload, MessageThread, NotificationItem } from '@/types/exploreHub';

export type DataStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface DataLifecycle {
  status: DataStatus;
  error: string | null;
  isRefreshing: boolean;
  lastFetchedAt: number | null;
  staleAt: number | null;
}

export interface ExploreHubState extends DataLifecycle {
  messages: MessageThread[];
  notifications: NotificationItem[];
  activities: ActivityItem[];
}

export type ExploreHubAction =
  | { type: 'LOAD_START'; payload: { refreshing: boolean } }
  | { type: 'LOAD_SUCCESS'; payload: { data: ExploreHubPayload; fetchedAt: number; staleAt: number } }
  | { type: 'LOAD_ERROR'; payload: { error: string } }
  | { type: 'MARK_THREAD_READ_OPTIMISTIC'; payload: { id: string } }
  | { type: 'MARK_THREAD_READ_ROLLBACK'; payload: { snapshot: MessageThread[] } }
  | { type: 'MARK_NOTIFICATION_READ_OPTIMISTIC'; payload: { id: string } }
  | { type: 'MARK_NOTIFICATION_READ_ROLLBACK'; payload: { snapshot: NotificationItem[] } }
  | { type: 'INVALIDATE_CACHE' };
