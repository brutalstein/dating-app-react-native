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
  title?: string;
  participantNames?: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  lastSeenAt?: string;
  isPinned?: boolean;
  teaserConversation?: boolean;
  teaserProfileLocked?: boolean;
  teaserCtaText?: string;
  isSystem?: boolean;
  source?: 'conversation' | 'system_notification';
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

export interface ExplainabilityItem {
  key: string;
  label: string;
  score: number;
  detail: string;
}

export interface ActivityItem {
  id: string;
  actor: ExploreUser;
  type: 'profile_view' | 'super_like' | 'new_match' | 'reaction' | 'boost' | 'recommendation' | 'system';
  summary: string;
  createdAt: string;
  score?: number;
  reason?: string;
  referenceId?: string;
  explainability?: ExplainabilityItem[];
  isSystem?: boolean;
  source?: 'activity_feed' | 'system_notification';
  actionKind?: 'open_profile' | 'info' | 'recommendation';
  actionLabel?: string;
}

export interface ExploreHubPayload {
  messages: MessageThread[];
  notifications: NotificationItem[];
  activities: ActivityItem[];
  unreadMessages?: number;
  unreadNotifications?: number;
}
