export type PriorityLevel = 'low' | 'medium' | 'high';

export interface ExploreUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  age?: number;
}

export interface MessageThread {
  id: string;
  user: ExploreUser;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  lastSeenAt?: string;
  isPinned?: boolean;
}

export interface NotificationItem {
  id: string;
  user: ExploreUser;
  type: 'like' | 'match' | 'visit' | 'message' | 'system';
  message: string;
  createdAt: string;
  isRead: boolean;
  priority: PriorityLevel;
  actionLabel?: string;
}

export interface ActivityItem {
  id: string;
  actor: ExploreUser;
  type: 'profile_view' | 'super_like' | 'new_match' | 'reaction' | 'boost';
  summary: string;
  createdAt: string;
  score?: number;
}

export interface ExploreHubPayload {
  messages: MessageThread[];
  notifications: NotificationItem[];
  activities: ActivityItem[];
  unreadMessages?: number;
  unreadNotifications?: number;
}
