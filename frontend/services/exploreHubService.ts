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
      messages: data.messages ?? [],
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
        type: a.type === 'MATCH_CREATED' ? 'new_match' : a.type === 'LIKE_RECEIVED' ? 'reaction' : 'profile_view',
        summary: a.summary,
        createdAt: a.createdAt,
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

  async markNotificationAsRead(_id: string): Promise<void> {
    return;
  },
};
