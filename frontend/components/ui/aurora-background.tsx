import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

function Orb({ color, delay = 0, size, x, y }: { color: string; delay?: number; size: number; x: number; y: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 6500 + delay,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + progress.value * 22 },
      { translateY: y - progress.value * 18 },
      { scale: 1 + progress.value * 0.06 },
    ],
    opacity: 0.3 + progress.value * 0.25,
  }));

  return <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, animatedStyle]} />;
}

export default function AuroraBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#09090B', '#111827', '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Orb color="#F472B6" size={width * 0.8} x={-width * 0.3} y={height * 0.08} delay={200} />
      <Orb color="#A78BFA" size={width * 0.72} x={width * 0.35} y={height * 0.2} delay={900} />
      <Orb color="#22D3EE" size={width * 0.9} x={-width * 0.15} y={height * 0.64} delay={1200} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
