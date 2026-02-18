import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { ExploreHubAuthError, ExploreHubRateLimitError, exploreHubService } from '@/services/exploreHubService';
import { connectRealtime, disconnectRealtime } from '@/services/realtimeService';
import { useAuthSession } from '@/hooks/useAuthSession';
import { exploreHubInitialState, exploreHubReducer } from './reducer';
import { exploreHubSelectors } from './selectors';
import { ExploreHubState } from './types';

const STALE_TIME_MS = 60 * 1000;
const RECONNECT_REFRESH_MIN_INTERVAL_MS = 30 * 1000;

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
  const { ready, authenticated } = useAuthSession();
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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      exploreHubService.invalidateCache();
      dispatch({ type: 'RESET_FOR_AUTH' });
      disconnectRealtime();
    }
  }, [ready, authenticated]);

  const load = useCallback(async (forceRefresh = false) => {
    if (!ready || !authenticated) {
      return;
    }

    const currentState = stateRef.current;

    if (!forceRefresh && (currentState.status === 'loading' || currentState.isRefreshing)) {
      return;
    }

    const shouldRefresh =
      forceRefresh || currentState.status === 'idle' || exploreHubSelectors.isStale(currentState);

    if (!shouldRefresh) {
      return;
    }

    dispatch({ type: 'LOAD_START', payload: { refreshing: currentState.status !== 'idle' } });

    try {
      const payload = await exploreHubService.fetchExploreHub();
      const now = Date.now();
      dispatch({ type: 'LOAD_SUCCESS', payload: { data: payload, fetchedAt: now, staleAt: now + STALE_TIME_MS } });
    } catch (err) {
      if (err instanceof ExploreHubRateLimitError || err instanceof ExploreHubAuthError) {
        dispatch({ type: 'SET_STALE_AT', payload: { staleAt: Date.now() + err.retryAfterMs } });
        const hasData =
          currentState.messages.length > 0 ||
          currentState.notifications.length > 0 ||
          currentState.activities.length > 0;

        if (hasData) {
          return;
        }
      }

      dispatch({ type: 'LOAD_ERROR', payload: { error: err instanceof Error ? err.message : 'Bir hata oluştu' } });
    }
  }, [ready, authenticated]);

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
    if (!ready || !authenticated) {
      disconnectRealtime();
      return;
    }

    connectRealtime({
      onEvent: (eventType, payload) => {
        if (eventType === 'EXPLORE_HUB_UPDATED' || eventType === 'LIKE_RECEIVED' || eventType === 'MATCH_CREATED') {
          dispatch({ type: 'APPLY_REALTIME_PAYLOAD', payload: { data: payload } });
        }
      },
      onConnected: () => {
        const lastFetchedAt = stateRef.current.lastFetchedAt ?? 0;
        if (Date.now() - lastFetchedAt >= RECONNECT_REFRESH_MIN_INTERVAL_MS) {
          void load(false);
        }
      },
    });

    return () => disconnectRealtime();
  }, [ready, authenticated, load]);

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
