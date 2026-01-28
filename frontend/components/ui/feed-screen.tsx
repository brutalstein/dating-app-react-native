
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const POST_IMAGE_HEIGHT = width;

interface Story {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  hasUnseenStory?: boolean;
  isOwn?: boolean;
}

interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  
  images: string[];
  caption: string;
  likes: number;
  comments: number;
  timestamp: Date;
  isLiked?: boolean;
  isSaved?: boolean;
  location?: string;
}

interface FeedScreenProps {
  posts: Post[];
  stories: Story[];
  currentUserId: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onStoryPress?: (story: Story) => void;
  onUserPress?: (userId: string) => void;
  onCreateStory?: () => void;
  onCreatePost?: () => void;
  onNotifications?: () => void;
  onMessages?: () => void;
  darkMode?: boolean;
}

const FeedScreen: React.FC<FeedScreenProps> = ({
  posts,
  stories,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onSave,
  onStoryPress,
  onUserPress,
  onCreateStory,
  onCreatePost,
  onNotifications,
  onMessages,
  darkMode = false,
}) => {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // Emerald theme
  const gradientColors = darkMode
    ? (['#34D399', '#10B981'] as const)
    : (['#10B981', '#059669'] as const);
  const accentColor = darkMode ? '#34D399' : '#10B981';
  const storyGradient = ['#F59E0B', '#EC4899', '#8B5CF6'] as const;

  // Theme colors
  const bgColor = darkMode ? '#0A0A0F' : '#fff';
  const cardBgColor = darkMode ? '#1A1A24' : '#fff';
  const textColor = darkMode ? '#FFFFFF' : '#1a1a2e';
  const textSecondary = darkMode ? '#A0A0A0' : '#888';
  const borderColor = darkMode ? '#2E2E3D' : '#f0f0f0';

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const handleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    onLike?.(postId);
  };

  const handleSave = (postId: string) => {
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    onSave?.(postId);
  };

  const StoryItem = ({ story, index }: { story: Story; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        style={styles.storyItem}
        onPress={() => (story.isOwn ? onCreateStory?.() : onStoryPress?.(story))}
      >
        <View style={styles.storyAvatarContainer}>
          {story.hasUnseenStory && !story.isOwn && (
            <LinearGradient
              colors={storyGradient}
              style={styles.storyRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View
            style={[
              styles.storyAvatarWrapper,
              { backgroundColor: bgColor },
              !story.hasUnseenStory && !story.isOwn && { padding: 0 },
            ]}
          >
            {story.avatar ? (
              <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
            ) : (
              <View style={[styles.storyAvatarPlaceholder, { backgroundColor: accentColor + '15' }]}>
                <Text style={[styles.avatarText, { color: accentColor }]}>
                  {story.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          {story.isOwn && (
            <View style={[styles.addStoryButton, { backgroundColor: accentColor }]}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          )}
        </View>
        <Text
          style={[styles.storyUsername, { color: textColor }]}
          numberOfLines={1}
        >
          {story.isOwn ? 'Your story' : story.username}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const PostCard = ({ post, index }: { post: Post; index: number }) => {
    const isLiked = likedPosts.has(post.id) || post.isLiked;
    const isSaved = savedPosts.has(post.id) || post.isSaved;
    const heartScale = useSharedValue(0);
    const likeButtonScale = useSharedValue(1);
    const [currentImage, setCurrentImage] = useState(0);

    const showHeartAnimation = () => {
      heartScale.value = withSequence(
        withSpring(1, { damping: 10 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 200 })
      );
    };

    const handleDoubleTap = () => {
      if (!isLiked) {
        handleLike(post.id);
      }
      showHeartAnimation();
    };

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        runOnJS(handleDoubleTap)();
      });

    const heartStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heartScale.value }],
      opacity: heartScale.value,
    }));

    const handleLikePress = () => {
      likeButtonScale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
      handleLike(post.id);
    };

    const likeButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: likeButtonScale.value }],
    }));

    return (
      <Animated.View
        entering={FadeInDown.delay(100 + index * 80).springify()}
        style={[styles.postContainer, { borderBottomColor: borderColor }]}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postUserInfo}
            onPress={() => onUserPress?.(post.user.id)}
          >
            {post.user.avatar ? (
              <Image source={{ uri: post.user.avatar }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatarPlaceholder, { backgroundColor: accentColor + '15' }]}>
                <Text style={[styles.avatarText, { color: accentColor }]}>
                  {post.user.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.usernameRow}>
                <Text style={[styles.postUsername, { color: textColor }]}>
                  {post.user.username}
                </Text>
                {post.user.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                )}
              </View>
              {post.location && (
                <Text style={[styles.postLocation, { color: textSecondary }]}>
                  {post.location}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        <GestureDetector gesture={doubleTap}>
          <View style={styles.postImageContainer}>
            <FlatList
              data={post.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setCurrentImage(Math.round(e.nativeEvent.contentOffset.x / width));
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.postImage} />
              )}
              keyExtractor={(_, i) => i.toString()}
            />
            {post.images.length > 1 && (
              <View style={styles.imagePagination}>
                {post.images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      { backgroundColor: i === currentImage ? accentColor : 'rgba(255,255,255,0.5)' },
                    ]}
                  />
                ))}
              </View>
            )}
            <Animated.View style={[styles.heartOverlay, heartStyle]}>
              <Ionicons name="heart" size={80} color="#fff" />
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Post Actions */}
        <View style={styles.postActions}>
          <View style={styles.leftActions}>
            <Animated.View style={likeButtonStyle}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isLiked ? '#EF4444' : textColor}
                />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onComment?.(post.id)}
            >
              <Ionicons name="chatbubble-outline" size={24} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onShare?.(post.id)}
            >
              <Ionicons name="paper-plane-outline" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleSave(post.id)}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
        </View>

        {/* Likes & Caption */}
        <View style={styles.postContent}>
          <Text style={[styles.likesText, { color: textColor }]}>
            {(post.likes + (likedPosts.has(post.id) && !post.isLiked ? 1 : 0)).toLocaleString()} likes
          </Text>
          <Text style={[styles.captionText, { color: textColor }]} numberOfLines={2}>
            <Text style={styles.captionUsername}>{post.user.username}</Text> {post.caption}
          </Text>
          {post.comments > 0 && (
            <TouchableOpacity onPress={() => onComment?.(post.id)}>
              <Text style={[styles.viewComments, { color: textSecondary }]}>
                View all {post.comments} comments
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.timestamp, { color: textSecondary }]}>
            {formatTimestamp(post.timestamp)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Feed</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={onCreatePost}>
              <Ionicons name="add-circle-outline" size={26} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onNotifications}>
              <Ionicons name="heart-outline" size={26} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onMessages}>
              <Ionicons name="paper-plane-outline" size={26} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stories */}
          <View style={[styles.storiesContainer, { borderBottomColor: borderColor }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesContent}
            >
              {stories.map((story, index) => (
                <StoryItem key={story.id} story={story} index={index} />
              ))}
            </ScrollView>
          </View>

          {/* Posts */}
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  storiesContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  storyAvatarContainer: {
    position: 'relative',
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  storyAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    margin: 2,
    overflow: 'hidden',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storyAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  postContainer: {
    borderBottomWidth: 0.5,
    paddingBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  postAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  postLocation: {
    fontSize: 12,
    marginTop: 1,
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: width,
    height: POST_IMAGE_HEIGHT,
    resizeMode: 'cover',
  },
  imagePagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionButton: {
    padding: 2,
  },
  postContent: {
    paddingHorizontal: 12,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewComments: {
    fontSize: 14,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});

export default FeedScreen;

// Usage Example:
// <FeedScreen
//   posts={[
//     {
//       id: '1',
//       user: { id: 'user1', username: 'john_doe', isVerified: true },
//       images: ['https://example.com/photo.jpg'],
//       caption: 'Beautiful sunset!',
//       likes: 1234,
//       comments: 56,
//       timestamp: new Date(),
//     },
//   ]}
//   stories={[
//     { id: '1', userId: 'user1', username: 'You', isOwn: true },
//     { id: '2', userId: 'user2', username: 'sarah', hasUnseenStory: true },
//   ]}
//   currentUserId="user1"
//   onLike={(postId) => console.log('Like:', postId)}
//   darkMode={false}
// />
