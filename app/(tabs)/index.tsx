import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeed } from '@/hooks/use-feed';
import { RecognitionCard } from '@/components/feed/RecognitionCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { NewItemsBanner } from '@/components/feed/NewItemsBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUIStore } from '@/stores/ui-store';
import { useReactionRealtime } from '@/hooks/use-reaction-realtime';

const PURPLE = '#7B1FA2';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F2', padding: 16, paddingTop: 8 }}>
          <FeedHeader />
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={handleRefresh}
              tintColor={PURPLE}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isFetchingNextPage ? <SkeletonCard /> : null}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          initialNumToRender={8}
        />
      </View>
    </SafeAreaView>
  );
}
