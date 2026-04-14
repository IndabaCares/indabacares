import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeed } from '@/hooks/use-feed';
import { useFeedSearch } from '@/hooks/use-feed-search';
import { useCelebrations } from '@/hooks/use-celebrations';
import { RecognitionCard } from '@/components/feed/RecognitionCard';
import { CelebrationCard } from '@/components/feed/CelebrationCard';
import { SkillCard } from '@/components/feed/SkillCard';
import { FeedHeader, type FeedFilter } from '@/components/feed/FeedHeader';
import { NewItemsBanner } from '@/components/feed/NewItemsBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useUIStore } from '@/stores/ui-store';
import { useReactionRealtime } from '@/hooks/use-reaction-realtime';
import { useEmployee } from '@/providers/EmployeeContext';
import { HOTELS, APA_HOTEL } from '@/lib/hotels';
import type { CelebrationFeedItem } from '@/hooks/use-celebrations';
import type { RecognitionFeedItem } from '@/api/queries';

const PURPLE = '#7B1FA2';

const HOTEL_LOGOS: Record<string, ReturnType<typeof require>> = {
  'Indaba Hotel':              require('../../assets/indabahotel.png'),
  'Indaba Lodge Richards Bay': require('../../assets/indabalodgerichardsbay.png'),
  'Indaba Lodge Gaborone':     require('../../assets/indabalodgegaborone.png'),
  'Chobe Safari Lodge':        require('../../assets/chobesafarilodge.png'),
  'Nata Lodge':                require('../../assets/natalodge.png'),
};

// ─── Mock cards (design preview) ─────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];
const NOW   = new Date().toISOString();

const MOCK_BIRTHDAY: CelebrationFeedItem = {
  _type: 'celebration', id: 'mock-bday', type: 'birthday', milestone: null,
  celebrated_on: TODAY, created_at: NOW,
  employee: { id: 'mb1', full_name: 'Sarah Johnson', hotel: '', department: 'Front Office', position: 'Receptionist', photo_url: null },
};

const MOCK_MILESTONE: CelebrationFeedItem = {
  _type: 'celebration', id: 'mock-ms', type: 'anniversary', milestone: 5,
  celebrated_on: TODAY, created_at: NOW,
  employee: { id: 'mb2', full_name: 'James Mokoena', hotel: '', department: 'Food & Beverage', position: 'Head Chef', photo_url: null },
};

const MOCK_SKILL: RecognitionFeedItem = {
  id: 'mock-skill', badge: 'Customer Service', hotel: '',
  message: 'Always goes above and beyond for every guest — exceptional service every single day!',
  created_at: NOW, recipient_response: null, recipient_responded_at: null,
  sender:   { id: 'ms1', full_name: 'Thabo Nkosi',  employee_code: 'TN001', position: 'Manager',         department: 'Management',   photo_url: null },
  receiver: { id: 'ms2', full_name: 'Priya Patel',   employee_code: 'PP002', position: 'Guest Relations', department: 'Front Office', photo_url: null },
  likes_count: [{ count: 5 }], comments_count: [{ count: 2 }],
};

function LegendCard() {
  return (
    <LinearGradient
      colors={['#1a0a2e', '#3b0764', '#1a0a2e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={legend.card}
    >
      <View style={legend.top}>
        <Text style={legend.crown}>👑</Text>
        <Text style={legend.title}>Legend of the Month</Text>
        <Text style={legend.month}>April 2026</Text>
      </View>

      <View style={legend.divider} />

      <View style={legend.stats}>
        <View style={legend.stat}>
          <Text style={legend.statValue}>24</Text>
          <Text style={legend.statLabel}>{'Recognitions\nGiven'}</Text>
        </View>
        <View style={legend.statDivider} />
        <View style={legend.stat}>
          <Text style={legend.statValue}>18</Text>
          <Text style={legend.statLabel}>{'Recognitions\nReceived'}</Text>
        </View>
        <View style={legend.statDivider} />
        <View style={legend.stat}>
          <Text style={[legend.statValue, { color: '#fbbf24' }]}>#1</Text>
          <Text style={legend.statLabel}>{'Hotel\nRank'}</Text>
        </View>
      </View>

      <View style={legend.badge}>
        <Ionicons name="trophy" size={14} color="#fbbf24" />
        <Text style={legend.badgeText}>Gold Status Achieved</Text>
      </View>
    </LinearGradient>
  );
}

const legend = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    shadowColor: '#7B1FA2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  top: { alignItems: 'center', marginBottom: 16 },
  crown: { fontSize: 36, marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.5 },
  month: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 14, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' },
  badge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fbbf24', letterSpacing: 0.3 },
});

// ─── APA Hotel Picker ─────────────────────────────────────────────────────────

function HotelPicker({ onSelect }: { onSelect: (hotel: string) => void }) {
  return (
    <ScrollView contentContainerStyle={picker.body}>
      <Text style={picker.hint}>Select a property to view its feed</Text>
      {HOTELS.filter((h) => h !== APA_HOTEL).map((hotel) => (
        <TouchableOpacity
          key={hotel}
          activeOpacity={0.75}
          style={picker.row}
          onPress={() => onSelect(hotel)}
        >
          <View style={picker.iconWrap}>
            {HOTEL_LOGOS[hotel] ? (
              <Image source={HOTEL_LOGOS[hotel]} style={picker.hotelLogo} resizeMode="contain" />
            ) : (
              <Ionicons name="business-outline" size={22} color={PURPLE} />
            )}
          </View>
          <Text style={picker.label}>{hotel}</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const picker = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hotelLogo: {
    width: 44,
    height: 44,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  useReactionRealtime();

  const { employee } = useEmployee();
  const isAPA = employee?.hotel === APA_HOTEL;

  const [selectedHotel, setSelectedHotel] = useState<string | null>(
    isAPA ? null : (employee?.hotel ?? ''),
  );
  const [searchTerm,   setSearchTerm]   = useState('');
  const [activeFilter, setActiveFilter] = useState<FeedFilter | null>(null);
  const isSearching = searchTerm.trim().length > 0;

  const hotel = selectedHotel ?? '';

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useFeed(hotel);

  const { data: searchResults, isLoading: searchLoading } = useFeedSearch(searchTerm, hotel);
  const { data: celebrations = [] } = useCelebrations(hotel);

  const resetNewFeedItems = useUIStore((s) => s.resetNewFeedItems);
  const liveRecognitions  = data?.pages.flatMap((page) => page) ?? [];

  const baseItems = isSearching ? (searchResults ?? []) : liveRecognitions;

  const filteredItems = (() => {
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

  type FeedEntry = RecognitionFeedItem | CelebrationFeedItem;
  const feedItems: FeedEntry[] = (!isSearching && !activeFilter)
    ? [...celebrations, ...filteredItems]
    : filteredItems;

  const handleRefresh = useCallback(() => {
    resetNewFeedItems();
    refetch();
  }, [refetch, resetNewFeedItems]);

  const handleEndReached = useCallback(() => {
    if (!isSearching && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isSearching, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // APA with no hotel selected — show picker below the purple header
  if (isAPA && !selectedHotel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
          <FeedHeader
            searchTerm=""
            onSearchChange={() => {}}
            activeFilter={null}
            onFilterChange={() => {}}
          />
          <HotelPicker onSelect={setSelectedHotel} />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <>
      <FeedHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      {/* APA hotel strip — shows selected hotel + swap button */}
      {isAPA && selectedHotel && (
        <View style={styles.hotelStrip}>
          <Ionicons name="business-outline" size={14} color={PURPLE} />
          <Text style={styles.hotelStripText}>{selectedHotel}</Text>
          <TouchableOpacity onPress={() => setSelectedHotel(null)} hitSlop={8}>
            <Ionicons name="swap-horizontal-outline" size={18} color={PURPLE} />
          </TouchableOpacity>
        </View>
      )}
    </>
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
            keyExtractor={(item) =>
              (item as CelebrationFeedItem)._type === 'celebration'
                ? `cel-${item.id}`
                : item.id
            }
            renderItem={({ item }) =>
              (item as CelebrationFeedItem)._type === 'celebration'
                ? <CelebrationCard celebration={item as CelebrationFeedItem} />
                : <RecognitionCard recognition={item as RecognitionFeedItem} />
            }
            ListHeaderComponent={
              <View>
                <LegendCard />
                <CelebrationCard celebration={MOCK_BIRTHDAY} />
                <CelebrationCard celebration={MOCK_MILESTONE} />
                <SkillCard recognition={MOCK_SKILL} />
              </View>
            }
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
  hotelStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#ede9fe',
  },
  hotelStripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE,
  },
});
