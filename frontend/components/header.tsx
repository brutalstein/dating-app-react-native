import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BloomLogo from '@/components/ui/bloom-logo';

const BLOOM_COLOR = '#FF5A5F';

export const Header = React.memo(function Header() {
  return (
    <View style={styles.headerContainer}>
      <BloomLogo size="md" showStatusDot />

      <View style={styles.iconGroup}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="options-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color="white" />
          <View style={styles.badge} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="white" />
          <View style={[styles.badge, { backgroundColor: BLOOM_COLOR }]} />
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
});
