import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { exploreHubService } from '@/services/exploreHubService';
import { connectRealtime, disconnectRealtime } from '@/services/realtimeService';
import { exploreHubInitialState, exploreHubReducer } from './reducer';
import { exploreHubSelectors } from './selectors';
import { ExploreHubState } from './types';

const STALE_TIME_MS = 60 * 1000;

type ExploreHubContextValue = {
  state: ExploreHubState;
  load: (forceRefresh?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  invalidate: () => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markThreadAsRead: (id: string) => Promise<void>;
};

const ExploreHubContext = createContext<ExploreHubContextValue | null>(null);

export function ExploreHubProvider({ children }: { children: React.ReactNode }) {
  const cached = exploreHubService.getCachedPayload();
  const [state, dispatch] = useReducer(
    exploreHubReducer,
    cached
      ? {
          ...exploreHubInitialState,
          ...cached,
          status:
            cached.messages.length === 0 && cached.notifications.length === 0 && cached.activities.length === 0
              ? 'empty'
              : 'success',
          lastFetchedAt: Date.now(),
          staleAt: Date.now() + STALE_TIME_MS,
        }
      : exploreHubInitialState
  );

  const load = useCallback(
    async (forceRefresh = false) => {
      const shouldRefresh = forceRefresh || state.status === 'idle' || exploreHubSelectors.isStale(state);
      if (!shouldRefresh) return;

      dispatch({ type: 'LOAD_START', payload: { refreshing: state.status !== 'idle' } });

      try {
        const payload = await exploreHubService.fetchExploreHub();
        const now = Date.now();
        dispatch({ type: 'LOAD_SUCCESS', payload: { data: payload, fetchedAt: now, staleAt: now + STALE_TIME_MS } });
      } catch (err) {
        dispatch({ type: 'LOAD_ERROR', payload: { error: err instanceof Error ? err.message : 'Bir hata oluştu' } });
      }
    },
    [state]
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const invalidate = useCallback(() => {
    exploreHubService.invalidateCache();
    dispatch({ type: 'INVALIDATE_CACHE' });
  }, []);

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      const snapshot = state.notifications;
      dispatch({ type: 'MARK_NOTIFICATION_READ_OPTIMISTIC', payload: { id } });
      try {
        await exploreHubService.markNotificationAsRead(id);
      } catch {
        dispatch({ type: 'MARK_NOTIFICATION_READ_ROLLBACK', payload: { snapshot } });
      }
    },
    [state.notifications]
  );

  const markThreadAsRead = useCallback(
    async (id: string) => {
      const snapshot = state.messages;
      dispatch({ type: 'MARK_THREAD_READ_OPTIMISTIC', payload: { id } });
      try {
        await exploreHubService.markThreadAsRead(id);
      } catch {
        dispatch({ type: 'MARK_THREAD_READ_ROLLBACK', payload: { snapshot } });
      }
    },
    [state.messages]
  );

  useEffect(() => {
    connectRealtime({
      onEvent: (eventType, payload) => {
        if (eventType === 'EXPLORE_HUB_UPDATED' || eventType === 'LIKE_RECEIVED' || eventType === 'MATCH_CREATED') {
          dispatch({ type: 'APPLY_REALTIME_PAYLOAD', payload: { data: payload } });
        }
      },
      onConnected: () => {
        void load(true);
      },
    });
    return () => disconnectRealtime();
  }, [load]);

  const value = useMemo(
    () => ({ state, load, refresh, invalidate, markNotificationAsRead, markThreadAsRead }),
    [state, load, refresh, invalidate, markNotificationAsRead, markThreadAsRead]
  );

  return <ExploreHubContext.Provider value={value}>{children}</ExploreHubContext.Provider>;
}

function useExploreHubContext() {
  const context = useContext(ExploreHubContext);
  if (!context) {
    throw new Error('useExploreHubContext must be used within ExploreHubProvider');
  }
  return context;
}

export function useExploreHubStore() {
  return useExploreHubContext();
}
