import api from '@/api/config';
import { ExploreHubPayload } from '@/types/exploreHub';

let cachedPayload: ExploreHubPayload | null = null;

export const exploreHubService = {
  getCachedPayload() {
    return cachedPayload;
  },

  invalidateCache() {
    cachedPayload = null;
  },

  async fetchExploreHub(): Promise<ExploreHubPayload> {
    const { data } = await api.get('/explore-hub');
    const payload: ExploreHubPayload = {
      messages: (data.messages ?? []).map((m: any) => ({
        id: m.conversationId,
        user: {
          id: m.otherUserId,
          fullName: m.otherUserName,
          avatarUrl: m.otherUserAvatar,
        },
        lastMessage: m.lastMessage,
        lastMessageAt: m.lastMessageAt,
        unreadCount: m.unreadCount,
        isOnline: m.online,
        lastSeenAt: m.lastSeenAt,
      })),
      notifications: (data.notifications ?? []).map((n: any) => ({
        id: n.id,
        type: String(n.type || 'system').toLowerCase(),
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.read,
        priority: n.type === 'MATCH' ? 'high' : n.type === 'MESSAGE' ? 'medium' : 'low',
        user: { id: 'system', fullName: n.title || 'Bloom' },
      })),
      activities: (data.activities ?? []).map((a: any) => ({
        id: a.id,
        type:
          a.type === 'MATCH_CREATED'
            ? 'new_match'
            : a.type === 'LIKE_RECEIVED'
            ? 'reaction'
            : a.type === 'RECOMMENDATION_FOUND'
            ? 'recommendation'
            : 'profile_view',
        summary: a.summary,
        createdAt: a.createdAt,
        score: typeof a.score === 'number' ? a.score : undefined,
        reason: a.reason ?? undefined,
        referenceId: a.referenceId ?? undefined,
        actor: { id: a.actorId ?? 'system', fullName: a.actorName ?? 'Bloom', avatarUrl: a.actorAvatar ?? undefined },
      })),
      unreadMessages: data.unreadMessages ?? 0,
      unreadNotifications: data.unreadNotifications ?? 0,
    } as any;

    cachedPayload = payload;
    return payload;
  },

  async markThreadAsRead(id: string): Promise<void> {
    await api.post(`/conversations/${id}/read`);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },
};
