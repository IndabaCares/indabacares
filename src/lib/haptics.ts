import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function notificationHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
    // Silently fail if haptics unavailable
  });
}

export function impactHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (Platform.OS === 'web') return;
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };
  Haptics.impactAsync(map[style]).catch(() => {});
}
