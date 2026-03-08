import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useUIStore } from '@/stores/ui-store';

const TOAST_COLORS = {
  success: { bg: 'bg-success-500', text: 'text-white' },
  error: { bg: 'bg-danger-500', text: 'text-white' },
  info: { bg: 'bg-primary-500', text: 'text-white' },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  return (
    <>
      {children}
      <View
        className="absolute left-4 right-4 z-50"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(300)}
            exiting={FadeOutUp.duration(200)}
          >
            <Pressable
              onPress={() => dismissToast(toast.id)}
              className={`mb-2 rounded-xl px-4 py-3 shadow-lg ${TOAST_COLORS[toast.type].bg}`}
            >
              <Text className={`text-sm font-semibold ${TOAST_COLORS[toast.type].text}`}>
                {toast.message}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </>
  );
}
