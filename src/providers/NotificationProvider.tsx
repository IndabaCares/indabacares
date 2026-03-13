import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEmployee } from '@/providers/EmployeeContext';
import { routeFromNotification } from '@/utils/notification-router';
import type { NotificationType } from '@/types/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
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
  const { employee }          = useEmployee();
  const notificationListener  = useRef<Notifications.EventSubscription>(undefined);
  const responseListener      = useRef<Notifications.EventSubscription>(undefined);

  useEffect(() => {
    if (!employee) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        // TODO: save token to a push_tokens table keyed by employee_id
        console.log('Push token registered:', token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Handled by realtime subscription in useGlobalRealtime
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: NotificationType;
          referenceType?: string;
          referenceId?: string;
        };
        if (data) {
          routeFromNotification({
            type:          data.type || 'system',
            referenceType: data.referenceType,
            referenceId:   data.referenceId,
          });
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [employee?.employee_id]);

  return <>{children}</>;
}
