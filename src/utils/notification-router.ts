import { router } from 'expo-router';
import type { NotificationType } from '@/types/database';

interface NotificationData {
  type: NotificationType;
  referenceType?: string;
  referenceId?: string;
}

export function routeFromNotification(data: NotificationData): void {
  const { referenceType, referenceId } = data;

  if (!referenceType || !referenceId) {
    router.push('/(screens)/notifications');
    return;
  }

  switch (referenceType) {
    case 'recognition':
      router.push(`/(screens)/recognition/${referenceId}`);
      break;
    case 'redemption':
      router.push('/(screens)/orders');
      break;
    case 'badge':
      router.push('/(tabs)/profile');
      break;
    default:
      router.push('/(screens)/notifications');
  }
}
