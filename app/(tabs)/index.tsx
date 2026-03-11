import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useFeed } from '@/hooks/use-feed';
import { RecognitionCard } from '@/components/feed/RecognitionCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { NewItemsBanner } from '@/components/feed/NewItemsBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUIStore } from '@/stores/ui-store';
import { useReactionRealtime } from '@/hooks/use-reaction-realtime';

export default function FeedScreen() {
  useReactionRealtime();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  const resetNewFeedItems = useUIStore((s) => s.resetNewFeedItems);

  const recognitions = data?.pages.flatMap((page) => page) ?? [];

  const handleRefresh = useCallback(() => {
    resetNewFeedItems();
    refetch();
  }, [refetch, resetNewFeedItems]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 pt-4">
        <FeedHeader />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <NewItemsBanner onRefresh={handleRefresh} />

      <FlatList
        data={recognitions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecognitionCard recognition={item as any} />}
        ListHeaderComponent={<FeedHeader />}
        ListEmptyComponent={
          <EmptyState
            icon="🎉"
            title="No recognitions yet"
            description="Be the first to recognize a colleague!"
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={handleRefresh}
            tintColor="#7c3aed"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? <SkeletonCard /> : null
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        initialNumToRender={8}
      />
    </View>
  );
}
