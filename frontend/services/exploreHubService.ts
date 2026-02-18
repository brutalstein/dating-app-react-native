import * as SecureStore from 'expo-secure-store';
import api, { sanitizeToken } from '@/api/config';
import { ExploreHubPayload } from '@/types/exploreHub';

let cachedPayload: ExploreHubPayload | null = null;
let inFlightRequest: Promise<ExploreHubPayload> | null = null;
let blockedUntilMs = 0;
let nextAllowedNetworkFetchAtMs = 0;

const MIN_NETWORK_FETCH_INTERVAL_MS = 15 * 1000;

export class ExploreHubRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'ExploreHubRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class ExploreHubAuthError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs = 30_000) {
    super(message);
    this.name = 'ExploreHubAuthError';
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfterSeconds(raw: unknown): number {
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.ceil(parsed);
  }
  return 15;
}

function mapPayload(data: any): ExploreHubPayload {
  const notifications = (data.notifications ?? []).map((n: any) => ({
    id: n.id,
    type: String(n.type || 'system').toLowerCase(),
    message: n.message,
    createdAt: n.createdAt,
    isRead: n.read,
    priority: n.type === 'MATCH' ? 'high' : n.type === 'MESSAGE' ? 'medium' : 'low',
    user: { id: 'system', fullName: n.title || 'Bloom' },
  }));

  const systemMessageThreads = notifications
    .filter((n: any) => String(n.type).toLowerCase() === 'system')
    .map((n: any) => ({
      id: `system-${n.id}`,
      user: { id: 'system', fullName: 'Bloom Sistem' },
      title: 'Sistem Mesajı',
      participantNames: ['Bloom Sistem'],
      lastMessage: n.message,
      lastMessageAt: n.createdAt,
      unreadCount: n.isRead ? 0 : 1,
      isOnline: false,
      lastSeenAt: n.createdAt,
      isPinned: true,
      teaserConversation: false,
      teaserProfileLocked: false,
      teaserCtaText: undefined,
      isSystem: true,
      source: 'system_notification' as const,
    }));

  const devSystemMessageThreads = __DEV__ && systemMessageThreads.length === 0
    ? [{
        id: 'system-dev-preview',
        user: { id: 'system', fullName: 'Bloom Sistem' },
        title: 'Sistem Mesajı (Test)',
        participantNames: ['Bloom Sistem'],
        lastMessage: 'Test modu: Sistem kaynaklı mesajlar burada görünür.',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isOnline: false,
        lastSeenAt: new Date().toISOString(),
        isPinned: true,
        teaserConversation: false,
        teaserProfileLocked: false,
        teaserCtaText: undefined,
        isSystem: true,
        source: 'system_notification' as const,
      }]
    : [];

  return {
    messages: [
      ...(data.messages ?? []).map((m: any) => ({
        id: m.conversationId ?? m.id,
        user: {
          id: m.otherUserId,
          fullName: m.otherUserName,
          avatarUrl: m.otherUserAvatar,
        },
        title: m.conversationTitle ?? m.title ?? undefined,
        participantNames: Array.isArray(m.participantNames)
          ? m.participantNames
          : Array.isArray(m.participants)
          ? m.participants
              .map((participant: any) => participant?.name ?? participant?.fullName)
              .filter(Boolean)
          : undefined,
        lastMessage: m.lastMessage,
        lastMessageAt: m.lastMessageAt,
        unreadCount: m.unreadCount,
        isOnline: m.online,
        lastSeenAt: m.lastSeenAt,
        teaserConversation: Boolean(m.teaserConversation),
        teaserProfileLocked: Boolean(m.teaserProfileLocked),
        teaserCtaText: m.teaserCtaText,
        isSystem: false,
        source: 'conversation' as const,
      })),
      ...systemMessageThreads,
      ...devSystemMessageThreads,
    ],
    notifications,
    activities: [
      ...(data.activities ?? []).map((a: any) => {
        const mappedType =
          a.type === 'MATCH_CREATED'
            ? 'new_match'
            : a.type === 'LIKE_RECEIVED'
            ? 'reaction'
            : a.type === 'RECOMMENDATION_FOUND'
            ? 'recommendation'
            : a.type === 'MESSAGE_RECEIVED'
            ? 'reaction'
            : 'system';

        const isSystem = mappedType === 'system' || !a.actorId;

        const actionKind = mappedType === 'recommendation' ? 'recommendation' : isSystem ? 'info' : 'open_profile';
        const actionLabel = actionKind === 'open_profile' ? 'Profili Gör' : actionKind === 'info' ? 'Bilgi' : undefined;

        return {
          id: a.id,
          type: mappedType,
          summary: a.summary,
          createdAt: a.createdAt,
          score: typeof a.score === 'number' ? a.score : undefined,
          reason: a.reason ?? undefined,
          referenceId: a.referenceId ?? undefined,
          explainability: a.explainability ?? [],
          actor: { id: a.actorId ?? 'system', fullName: a.actorName ?? 'Bloom Sistem', avatarUrl: a.actorAvatar ?? undefined },
          isSystem,
          source: isSystem ? 'system_notification' : 'activity_feed',
          actionKind,
          actionLabel,
        };
      }),
      ...(__DEV__
        ? [{
            id: 'system-activity-dev-preview',
            type: 'system',
            summary: 'Test modu: Sistem aktiviteleri burada listelenir.',
            createdAt: new Date().toISOString(),
            actor: { id: 'system', fullName: 'Bloom Sistem' },
            isSystem: true,
            source: 'system_notification' as const,
            actionKind: 'info' as const,
            actionLabel: 'Bilgi',
          }]
        : []),
    ],
    unreadMessages: data.unreadMessages ?? [...systemMessageThreads, ...devSystemMessageThreads].reduce((acc: number, item: any) => acc + item.unreadCount, 0),
    unreadNotifications: data.unreadNotifications ?? 0,
  } as any;
}

export const exploreHubService = {
  getCachedPayload() {
    return cachedPayload;
  },

  invalidateCache() {
    cachedPayload = null;
    nextAllowedNetworkFetchAtMs = 0;
  },

  getBlockedUntilMs() {
    return blockedUntilMs;
  },

  async fetchExploreHub(): Promise<ExploreHubPayload> {
    const now = Date.now();
    if (blockedUntilMs > now) {
      throw new ExploreHubRateLimitError('Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar deneyin.', blockedUntilMs - now);
    }

    if (inFlightRequest) {
      return inFlightRequest;
    }

    if (cachedPayload && nextAllowedNetworkFetchAtMs > now) {
      return cachedPayload;
    }

    const storedToken = await SecureStore.getItemAsync('token');
    const token = sanitizeToken(storedToken);
    if (!token) {
      if (storedToken) {
        await SecureStore.deleteItemAsync('token');
      }
      const retryAfterMs = 30_000;
      blockedUntilMs = Date.now() + retryAfterMs;
      nextAllowedNetworkFetchAtMs = blockedUntilMs;
      throw new ExploreHubAuthError('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.', retryAfterMs);
    }

    inFlightRequest = (async () => {
      try {
        const { data } = await api.get('/explore-hub');
        const payload = mapPayload(data);
        cachedPayload = payload;
        blockedUntilMs = 0;
        nextAllowedNetworkFetchAtMs = Date.now() + MIN_NETWORK_FETCH_INTERVAL_MS;
        return payload;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 429) {
          const retryAfterSeconds = parseRetryAfterSeconds(
            error?.response?.headers?.['retry-after'] ?? error?.response?.data?.retryAfterSeconds
          );
          const retryAfterMs = retryAfterSeconds * 1000;
          blockedUntilMs = Date.now() + retryAfterMs;
          nextAllowedNetworkFetchAtMs = blockedUntilMs;
          throw new ExploreHubRateLimitError('Sunucu yoğun. Yeniden denemeden önce biraz bekleyin.', retryAfterMs);
        }
        if (status === 401 || status === 403) {
          const retryAfterMs = 30_000;
          blockedUntilMs = Date.now() + retryAfterMs;
          nextAllowedNetworkFetchAtMs = blockedUntilMs;
          throw new ExploreHubAuthError('Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.', retryAfterMs);
        }
        throw error;
      } finally {
        inFlightRequest = null;
      }
    })();

    return inFlightRequest;
  },

  async markThreadAsRead(id: string): Promise<void> {
    await api.post(`/conversations/${id}/read`);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },
};
