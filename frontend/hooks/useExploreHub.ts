import { useCallback, useEffect, useMemo, useState } from 'react';
import { exploreHubService } from '@/services/exploreHubService';
import { ActivityItem, MessageThread, NotificationItem } from '@/types/exploreHub';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useExploreHub() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const cached = exploreHubService.getCachedPayload();
  const [messages, setMessages] = useState<MessageThread[]>(cached?.messages ?? []);
  const [notifications, setNotifications] = useState<NotificationItem[]>(cached?.notifications ?? []);
  const [activities, setActivities] = useState<ActivityItem[]>(cached?.activities ?? []);

  const load = useCallback(async (forceRefresh = false) => {
    try {
      setStatus('loading');
      setError(null);
      const payload = await exploreHubService.fetchExploreHub(forceRefresh);
      setMessages(payload.messages);
      setNotifications(payload.notifications);
      setActivities(payload.activities);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  }, []);

  useEffect(() => {
    if (!cached) {
      load();
      return;
    }
    setStatus('success');
  }, [cached, load]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }, []);

  const markThreadAsRead = useCallback((id: string) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)));
  }, []);

  const counts = useMemo(
    () => ({
      unreadMessages: messages.reduce((acc, m) => acc + m.unreadCount, 0),
      unreadNotifications: notifications.filter((n) => !n.isRead).length,
    }),
    [messages, notifications]
  );

  return {
    status,
    error,
    messages,
    notifications,
    activities,
    counts,
    load,
    markNotificationAsRead,
    markThreadAsRead,
  };
}
