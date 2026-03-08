import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface TypingIndicatorProps {
  typingUsers: Array<{ userId: string; fullName: string }>;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const names =
    typingUsers.length === 1
      ? typingUsers[0].fullName.split(' ')[0]
      : typingUsers.length === 2
        ? `${typingUsers[0].fullName.split(' ')[0]} and ${typingUsers[1].fullName.split(' ')[0]}`
        : `${typingUsers[0].fullName.split(' ')[0]} and ${typingUsers.length - 1} others`;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <View className="flex-row items-center px-3 py-1.5">
        <View className="mr-2 flex-row items-center space-x-0.5">
          <BouncingDot delay={0} />
          <BouncingDot delay={150} />
          <BouncingDot delay={300} />
        </View>
        <Text className="text-xs text-slate-400">
          {names} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </Text>
      </View>
    </Animated.View>
  );
}

function BouncingDot({ delay }: { delay: number }) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(200)}
      className="h-1.5 w-1.5 rounded-full bg-slate-400"
    />
  );
}
