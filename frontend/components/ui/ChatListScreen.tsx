
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
  FadeInRight,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Story {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  hasUnseenStory?: boolean;
  isOwn?: boolean;
}

interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    isVerified?: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: Date;
    isRead: boolean;
    senderId: string;
  };
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface ChatListScreenProps {
  currentUserId: string;
  conversations: Conversation[];
  stories?: Story[];
  onConversationPress?: (conversation: Conversation) => void;
  onStoryPress?: (story: Story) => void;
  onNewChat?: () => void;
  onSearch?: (query: string) => void;
  onBack?: () => void;
  darkMode?: boolean;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({
  currentUserId,
  conversations,
  stories = [],
  onConversationPress,
  onStoryPress,
  onNewChat,
  onSearch,
  onBack,
  darkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(conversations);

  const gradientColors = darkMode
    ? ['#A78BFA', '#8B5CF6'] as const
    : ['#8B5CF6', '#7C3AED'] as const;
  const accentColor = darkMode ? '#A78BFA' : '#8B5CF6';
  const bgColor = darkMode ? '#0A0A0F' : '#f8f9fa';
  const headerBgColor = darkMode ? '#13131A' : '#fff';
  const cardBgColor = darkMode ? '#1A1A24' : '#fff';
  const inputBgColor = darkMode ? '#1A1A24' : '#f5f5f5';
  const textColor = darkMode ? '#FFFFFF' : '#1a1a2e';
  const textSecondary = darkMode ? '#A0A0A0' : '#888';
  const borderColor = darkMode ? '#2E2E3D' : '#f0f0f0';
  const headerOpacity = useSharedValue(0);
  const searchScale = useSharedValue(0.95);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    searchScale.value = withDelay(200, withSpring(1, { damping: 15 }));
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter(
        (conv) =>
          conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
    onSearch?.(searchQuery);
  }, [searchQuery, conversations]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: interpolate(headerOpacity.value, [0, 1], [-20, 0]) }],
  }));

  const searchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
  }));

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      if (days === 1) return 'Yesterday';
      if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStory = ({ item, index }: { item: Story; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
      <TouchableOpacity
        style={styles.storyItem}
        onPress={() => onStoryPress?.(item)}
        activeOpacity={0.8}
      >
        {item.hasUnseenStory || item.isOwn ? (
          <LinearGradient
            colors={item.isOwn ? (darkMode ? ['#4B5563', '#374151'] : ['#D1D5DB', '#9CA3AF']) : gradientColors}
            style={styles.storyRing}
          >
            <View style={[styles.storyAvatarContainer, { backgroundColor: bgColor }]}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
              ) : (
                <View style={[styles.storyAvatarPlaceholder, { backgroundColor: accentColor }]}>
                  <Text style={styles.storyAvatarText}>{item.username.charAt(0)}</Text>
                </View>
              )}
              {item.isOwn && (
                <View style={[styles.addStoryBadge, { backgroundColor: accentColor }]}>
                  <Ionicons name="add" size={12} color="#fff" />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.storyRingInactive, { borderColor }]}>
            <View style={[styles.storyAvatarContainer, { backgroundColor: bgColor }]}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
              ) : (
                <View style={[styles.storyAvatarPlaceholder, { backgroundColor: textSecondary }]}>
                  <Text style={styles.storyAvatarText}>{item.username.charAt(0)}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        <Text
          style={[
            styles.storyUsername,
            { color: item.isOwn ? textSecondary : textColor },
          ]}
          numberOfLines={1}
        >
          {item.isOwn ? 'Your Story' : item.username}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const isUnread = item.unreadCount && item.unreadCount > 0;
    const isFromMe = item.lastMessage.senderId === currentUserId;

    return (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={[styles.conversationItem, { backgroundColor: cardBgColor }]}
          onPress={() => onConversationPress?.(item)}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {item.user.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={styles.conversationAvatar} />
            ) : (
              <View style={[styles.conversationAvatarPlaceholder, { backgroundColor: accentColor }]}>
                <Text style={styles.conversationAvatarText}>
                  {item.user.name.charAt(0)}
                </Text>
              </View>
            )}
            {item.user.isOnline && (
              <View style={[styles.onlineIndicator, { backgroundColor: '#22C55E', borderColor: cardBgColor }]} />
            )}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <View style={styles.nameContainer}>
                <Text
                  style={[
                    styles.conversationName,
                    { color: textColor },
                    isUnread ? styles.unreadName : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {item.user.name}
                </Text>
                {item.user.isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: accentColor }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                {item.isPinned && (
                  <Ionicons
                    name="pin"
                    size={14}
                    color={textSecondary}
                    style={styles.pinIcon}
                  />
                )}
              </View>
              <Text style={[styles.timeText, { color: isUnread ? accentColor : textSecondary }]}>
                {formatTime(item.lastMessage.timestamp)}
              </Text>
            </View>

            <View style={styles.messageRow}>
              <View style={styles.messagePreview}>
                {isFromMe && (
                  <Ionicons
                    name={item.lastMessage.isRead ? 'checkmark-done' : 'checkmark'}
                    size={16}
                    color={item.lastMessage.isRead ? accentColor : textSecondary}
                    style={styles.readIcon}
                  />
                )}
                <Text
                  style={[
                    styles.lastMessage,
                    { color: isUnread ? textColor : textSecondary },
                    isUnread ? styles.unreadMessage : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage.text}
                </Text>
              </View>

              <View style={styles.badges}>
                {item.isMuted && (
                  <Ionicons
                    name="volume-mute"
                    size={16}
                    color={textSecondary}
                    style={styles.mutedIcon}
                  />
                )}
                {isUnread && (
                  <View style={[styles.unreadBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.unreadCount}>
                      {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime();
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <Animated.View style={[styles.header, headerStyle, { backgroundColor: headerBgColor }]}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: textColor }]}>Messages</Text>
          <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
            <LinearGradient colors={gradientColors} style={styles.newChatGradient}>
              <Ionicons name="create-outline" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Animated.View style={[styles.searchContainer, searchStyle]}>
          <View style={[styles.searchBar, { backgroundColor: inputBgColor }]}>
            <Ionicons name="search" size={20} color={textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search messages..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Stories */}
      {stories.length > 0 && (
        <View style={[styles.storiesContainer, { borderBottomColor: borderColor }]}>
          <FlatList
            data={stories}
            renderItem={renderStory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesList}
          />
        </View>
      )}

      {/* Conversations List */}
      <FlatList
        data={sortedConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: accentColor + '15' }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={accentColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              Start a conversation with someone
            </Text>
            <TouchableOpacity onPress={onNewChat}>
              <LinearGradient
                colors={gradientColors}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Start Chat</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  newChatButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newChatGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    marginRight: 8,
  },
  storiesContainer: {
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  storiesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 24,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingInactive: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarContainer: {
    width: 58,
    height: 58,
    borderRadius: 20,
    padding: 2,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  storyAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addStoryBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  conversationsList: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  conversationAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '500',
  },
  unreadName: {
    fontWeight: '700',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  pinIcon: {
    marginLeft: 6,
    transform: [{ rotate: '45deg' }],
  },
  timeText: {
    fontSize: 13,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  readIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mutedIcon: {
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ChatListScreen;

// Usage Example:
// <ChatListScreen
//   currentUserId="user1"
//   stories={[
//     { id: '0', userId: 'user1', username: 'You', isOwn: true },
//     { id: '1', userId: 'user2', username: 'sarah', avatar: '...', hasUnseenStory: true },
//   ]}
//   conversations={[
//     {
//       id: '1',
//       user: { id: 'user2', name: 'Sarah Wilson', isOnline: true, isVerified: true },
//       lastMessage: { text: 'See you tomorrow!', timestamp: new Date(), isRead: true, senderId: 'user2' },
//       unreadCount: 2,
//       isPinned: true,
//     },
//   ]}
//   onConversationPress={(conv) => navigation.navigate('Chat', { conversationId: conv.id })}
//   onNewChat={() => navigation.navigate('NewChat')}
//   darkMode={false}
// />
