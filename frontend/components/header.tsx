import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BloomLogo from '@/components/ui/bloom-logo';
import { useRouter } from 'expo-router';
import { useExploreHub } from '@/hooks/useExploreHub';

const BLOOM_COLOR = '#FF5A5F';

export const Header = React.memo(function Header() {
  const router = useRouter();
  const { counts } = useExploreHub();

  return (
    <View style={styles.headerContainer}>
      <BloomLogo size="md" showStatusDot />

      <View style={styles.iconGroup}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/activity' as any)}>
          <Ionicons name="pulse-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/activity' as any)}>
          <Ionicons name="heart-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/messages' as any)}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="white" />
          {counts.unreadMessages > 0 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{counts.unreadMessages > 9 ? '9+' : counts.unreadMessages}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={24} color="white" />
          {counts.unreadNotifications > 0 && <View style={[styles.badge, { backgroundColor: BLOOM_COLOR }]} />}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#000',
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLOOM_COLOR,
    borderWidth: 2,
    borderColor: '#000',
  },
  badgePill: {
    position: 'absolute',
    top: -3,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLOOM_COLOR,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
