import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '@/hooks/use-feed';
import { useFeedSearch } from '@/hooks/use-feed-search';
import { RecognitionCard } from '@/components/feed/RecognitionCard';
import { FeedHeader, type FeedFilter } from '@/components/feed/FeedHeader';
import { NewItemsBanner } from '@/components/feed/NewItemsBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useUIStore } from '@/stores/ui-store';
import { useReactionRealtime } from '@/hooks/use-reaction-realtime';

const PURPLE = '#7B1FA2';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  useReactionRealtime();

  const [searchTerm,   setSearchTerm]   = useState('');
  const [activeFilter, setActiveFilter] = useState<FeedFilter | null>(null);
  const isSearching = searchTerm.trim().length > 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  const {
    data:      searchResults,
    isLoading: searchLoading,
  } = useFeedSearch(searchTerm);

  const resetNewFeedItems = useUIStore((s) => s.resetNewFeedItems);
  const liveRecognitions  = data?.pages.flatMap((page) => page) ?? [];

  const baseItems = isSearching ? (searchResults ?? []) : liveRecognitions;

  const feedItems = (() => {
    if (!activeFilter) return baseItems;
    const { category, value } = activeFilter;
    if (category === 'latest') {
      return [...baseItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (category === 'badge') {
      return baseItems.filter((item) => item.badge === value);
    }
    if (category === 'department') {
      return baseItems.filter((item) =>
        item.receiver.department === value || item.sender.department === value
      );
    }
    return baseItems;
  })();

  const handleRefresh = useCallback(() => {
    resetNewFeedItems();
    refetch();
  }, [refetch, resetNewFeedItems]);

  const handleEndReached = useCallback(() => {
    if (!isSearching && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isSearching, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const header = (
    <FeedHeader
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
          {header}
          <View style={{ padding: 16 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
        {header}
        {!isSearching && <NewItemsBanner onRefresh={handleRefresh} />}

        {isSearching && searchLoading ? (
          <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
        ) : isSearching && feedItems.length === 0 ? (
          <View style={styles.emptySearch}>
            <Ionicons name="search-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptySearchText}>No results for "{searchTerm}"</Text>
          </View>
        ) : (
          <FlatList
            data={feedItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RecognitionCard recognition={item as any} />}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptySearch}>
                  <Ionicons name="ribbon-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptySearchText}>
                    No recognitions yet.{'\n'}Be the first to recognise a colleague!
                  </Text>
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100, paddingTop: 6 }}
            refreshControl={
              !isSearching ? (
                <RefreshControl
                  refreshing={isRefetching && !isFetchingNextPage}
                  onRefresh={handleRefresh}
                  tintColor={PURPLE}
                />
              ) : undefined
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={isFetchingNextPage && !isSearching ? <SkeletonCard /> : null}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            initialNumToRender={8}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptySearch:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptySearchText: { fontSize: 15, color: '#94a3b8', textAlign: 'center' },
});
