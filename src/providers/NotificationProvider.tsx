import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth-store';
import { routeFromNotification } from '@/utils/notification-router';
import type { NotificationType } from '@/types/database';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const notificationListener = useRef<Notifications.EventSubscription>(undefined);
  const responseListener = useRef<Notifications.EventSubscription>(undefined);

  useEffect(() => {
    if (!user) return;

    // Register push token
    registerForPushNotifications().then((token) => {
      if (token) {
        // In production, save token to profiles table or push_tokens table
        console.log('Push token registered:', token);
      }
    });

    // Handle notification received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Handled by realtime subscription (toast + unread count)
      }
    );

    // Handle notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: NotificationType;
          referenceType?: string;
          referenceId?: string;
        };
        if (data) {
          routeFromNotification({
            type: data.type || 'system',
            referenceType: data.referenceType,
            referenceId: data.referenceId,
          });
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  return <>{children}</>;
}
