import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, ViewStyle } from 'react-native';

interface BloomLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showStatusDot?: boolean;
  withBackground?: boolean;
  textColor?: string;
  containerStyle?: ViewStyle;
}

const sizeMap = {
  sm: { icon: 16, text: 22 },
  md: { icon: 20, text: 28 },
  lg: { icon: 28, text: 36 },
} as const;

const BLOOM_COLOR = '#FF5A5F';

function BloomLogo({ size = 'md', showStatusDot = false, withBackground = false, textColor = BLOOM_COLOR, containerStyle }: BloomLogoProps) {
  const dimensions = sizeMap[size];

  return (
    <View
      className="flex-row items-center"
      style={[
        withBackground
          ? {
              backgroundColor: 'rgba(24,24,27,0.84)',
              borderWidth: 1,
              borderColor: 'rgba(113,113,122,0.55)',
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }
          : null,
        containerStyle,
      ]}
    >
      <Ionicons name="flame" size={dimensions.icon} color={BLOOM_COLOR} style={{ marginRight: 6, marginTop: 2 }} />
      <Text style={{ fontSize: dimensions.text, fontWeight: '900', color: textColor, letterSpacing: -1.2 }}>bloom</Text>
      {showStatusDot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginLeft: 4, marginTop: 8 }} /> : null}
    </View>
  );
}

export default React.memo(BloomLogo);
