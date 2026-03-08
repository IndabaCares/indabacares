import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height = 16, borderRadius = 8, className }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0',
        },
        animatedStyle,
      ]}
      className={className}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="mb-3 rounded-2xl border border-slate-100 bg-white p-4">
      <View className="mb-3 flex-row items-center">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="ml-3 flex-1">
          <Skeleton width="60%" height={14} />
          <Skeleton width="30%" height={12} className="mt-1" />
        </View>
      </View>
      <Skeleton width="100%" height={14} />
      <Skeleton width="80%" height={14} className="mt-2" />
      <Skeleton width="40%" height={14} className="mt-2" />
    </View>
  );
}
