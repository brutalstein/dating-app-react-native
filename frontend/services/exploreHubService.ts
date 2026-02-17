import { ExploreHubPayload, MessageThread, NotificationItem, ActivityItem } from '@/types/exploreHub';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const avatars = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
];

const timeOffset = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000).toISOString();

const messageSeed: MessageThread[] = [
  {
    id: 'm-1',
    user: { id: 'u-1', fullName: 'Elif Y.', age: 24, avatarUrl: avatars[0] },
    lastMessage: 'Akşam kahve için müsait misin? ☕️',
    lastMessageAt: timeOffset(4),
    unreadCount: 2,
    isOnline: true,
    isPinned: true,
  },
  {
    id: 'm-2',
    user: { id: 'u-2', fullName: 'Deniz K.', age: 26, avatarUrl: avatars[1] },
    lastMessage: 'Bugünkü etkinlik için teşekkürler 🙌',
    lastMessageAt: timeOffset(42),
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'm-3',
    user: { id: 'u-3', fullName: 'Mert A.', age: 27, avatarUrl: avatars[3] },
    lastMessage: 'Profilindeki playlist efsane.',
    lastMessageAt: timeOffset(140),
    unreadCount: 1,
    isOnline: true,
  },
];

const notificationSeed: NotificationItem[] = [
  {
    id: 'n-1',
    user: { id: 'u-4', fullName: 'Sena D.', avatarUrl: avatars[2] },
    type: 'match',
    message: 'Sena ile eşleşme oldu. Sohbeti başlat.',
    createdAt: timeOffset(9),
    isRead: false,
    priority: 'high',
    actionLabel: 'Mesaj Gönder',
  },
  {
    id: 'n-2',
    user: { id: 'u-5', fullName: 'Bloom', avatarUrl: undefined },
    type: 'system',
    message: 'Profil görünürlüğün bu hafta %18 arttı.',
    createdAt: timeOffset(95),
    isRead: true,
    priority: 'medium',
  },
  {
    id: 'n-3',
    user: { id: 'u-3', fullName: 'Mert A.', avatarUrl: avatars[3] },
    type: 'like',
    message: 'Mert profilini beğendi.',
    createdAt: timeOffset(220),
    isRead: false,
    priority: 'low',
  },
];

const activitySeed: ActivityItem[] = [
  {
    id: 'a-1',
    actor: { id: 'u-7', fullName: 'Alara', avatarUrl: avatars[4] },
    type: 'profile_view',
    summary: 'Profilini 3 kez ziyaret etti',
    createdAt: timeOffset(12),
    score: 87,
  },
  {
    id: 'a-2',
    actor: { id: 'u-8', fullName: 'Bora', avatarUrl: avatars[1] },
    type: 'reaction',
    summary: '“Film gecesi” ilgine reaksiyon bıraktı',
    createdAt: timeOffset(80),
    score: 64,
  },
  {
    id: 'a-3',
    actor: { id: 'u-9', fullName: 'Ece', avatarUrl: avatars[0] },
    type: 'super_like',
    summary: 'Sana Super Like gönderdi',
    createdAt: timeOffset(180),
    score: 95,
  },
];

let cachedPayload: ExploreHubPayload | null = null;

const buildPayload = (): ExploreHubPayload => ({
  messages: [...messageSeed].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt)),
  notifications: [...notificationSeed].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  activities: [...activitySeed].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
});

const setCache = (updater: (current: ExploreHubPayload) => ExploreHubPayload) => {
  const base = cachedPayload ?? buildPayload();
  cachedPayload = updater(base);
};

export const exploreHubService = {
  getCachedPayload() {
    return cachedPayload;
  },

  invalidateCache() {
    cachedPayload = null;
  },

  async fetchExploreHub(forceRefresh = false): Promise<ExploreHubPayload> {
    if (cachedPayload && !forceRefresh) {
      return cachedPayload;
    }

    await wait(450);
    cachedPayload = buildPayload();
    return cachedPayload;
  },

  async markThreadAsRead(id: string): Promise<void> {
    await wait(120);
    setCache((current) => ({
      ...current,
      messages: current.messages.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)),
    }));
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await wait(120);
    setCache((current) => ({
      ...current,
      notifications: current.notifications.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    }));
  },
};
