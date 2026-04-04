import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { routeFromNotification } from '@/utils/notification-router';
import type { NotificationType } from '@/types/database';

export const NOTIF_PERMISSION_KEY = 'indabacares.notif.asked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ─── Token registration (called when permission is already granted) ──────────

async function registerTokenIfGranted(
  employeeId: string,
  hotel:      string,
  attempt     = 1,
): Promise<void> {
  const MAX_RETRIES    = 3;
  const RETRY_DELAY_MS = 2000;

  try {
    if (Platform.OS === 'web') return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return; // Permission not yet granted — pre-permission screen will handle this

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.rpc('upsert_push_token', {
      p_employee_id: employeeId,
      p_hotel:       hotel,
      p_token:       tokenData.data,
      p_platform:    Platform.OS,
    });

    if (error) throw error;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      return registerTokenIfGranted(employeeId, hotel, attempt + 1);
    }
    console.warn('[Notifications] Token registration failed after retries:', err);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { employee }         = useEmployee();
  const notificationListener = useRef<Notifications.EventSubscription>(undefined);
  const responseListener     = useRef<Notifications.EventSubscription>(undefined);

  useEffect(() => {
    if (!employee) return;

    // Only attempt token registration if permission is already granted.
    // First-time permission request is handled by (screens)/notification-permission.tsx
    // which is navigated to after first login (see employee-auth.tsx).
    registerTokenIfGranted(employee.employee_id, employee.hotel);

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Foreground handling managed by setNotificationHandler above.
        // Feed / badge updates driven by realtime subscriptions.
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
