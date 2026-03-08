import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { routeFromNotification } from '@/utils/notification-router';

export default function NotificationsScreen() {
  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const hasUnread = notifications.some((n: any) => !n.is_read);

  const handlePress = (notification: any) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    routeFromNotification({
      type: notification.type,
      referenceType: notification.reference_type,
      referenceId: notification.reference_id,
    });
  };

  return (
    <View className="flex-1 bg-white">
      {hasUnread && (
        <View className="border-b border-slate-100 px-4 py-2">
          <Button
            title="Mark all as read"
            variant="ghost"
            size="sm"
            onPress={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
          />
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item as any} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="px-4 pt-4">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <EmptyState
              icon="🔔"
              title="No notifications"
              description="You're all caught up!"
            />
          )
        }
        ItemSeparatorComponent={() => <View className="h-px bg-slate-50" />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
        }
      />
    </View>
  );
}
