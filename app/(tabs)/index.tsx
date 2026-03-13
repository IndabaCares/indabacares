import React, { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeed } from '@/hooks/use-feed';
import { RecognitionCard } from '@/components/feed/RecognitionCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { NewItemsBanner } from '@/components/feed/NewItemsBanner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useUIStore } from '@/stores/ui-store';
import { useReactionRealtime } from '@/hooks/use-reaction-realtime';
import { RECOGNITION_BADGES } from '@/lib/constants';
import type { RecognitionFeedItem } from '@/api/queries';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK: RecognitionFeedItem[] = [
  {
    id: 'mock-1',
    message: 'The way you handled the VIP check-in last night was absolutely exceptional. Your calm under pressure and warm hospitality left a lasting impression on the guests. You truly represent everything we stand for.',
    badge: 'Hospitality Hero',
    hotel: 'demo',
    created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    sender:   { id: 's1', full_name: 'Marius Bonthuys',    employee_code: 'EMP001', position: 'Front Office Manager' },
    receiver: { id: 'r1', full_name: 'Lerato Dlamini',     employee_code: 'EMP002', position: 'Guest Relations' },
    likes_count: [{ count: 7 }], comments_count: [{ count: 3 }],
  },
  {
    id: 'mock-2',
    message: "Sipho, you went way beyond your role this week to train the new team members. Your patience and dedication to the team's growth is exactly the kind of leadership we need. Thank you!",
    badge: 'Leadership',
    hotel: 'demo',
    created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    sender:   { id: 's2', full_name: 'Thandi Nkosi',       employee_code: 'EMP003', position: 'HR Manager' },
    receiver: { id: 'r2', full_name: 'Sipho Mahlangu',     employee_code: 'EMP004', position: 'Senior Concierge' },
    likes_count: [{ count: 12 }], comments_count: [{ count: 5 }],
  },
  {
    id: 'mock-3',
    message: 'Congratulations on your brilliant idea to streamline the breakfast buffet setup! The feedback from guests has been overwhelmingly positive and the team loves the new workflow.',
    badge: 'Innovation',
    hotel: 'demo',
    created_at: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
    sender:   { id: 's3', full_name: 'Johan van der Berg', employee_code: 'EMP005', position: 'F&B Supervisor' },
    receiver: { id: 'r3', full_name: 'Ayanda Khumalo',     employee_code: 'EMP006', position: 'Breakfast Attendant' },
    likes_count: [{ count: 4 }], comments_count: [{ count: 1 }],
  },
  {
    id: 'mock-4',
    message: "Thank you for staying three hours late to help the housekeeping team turn over the conference rooms. You didn't have to, but you did — and it made all the difference for the morning event.",
    badge: 'Going the Extra Mile',
    hotel: 'demo',
    created_at: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    sender:   { id: 's4', full_name: 'Nomsa Sithole',      employee_code: 'EMP007', position: 'Events Coordinator' },
    receiver: { id: 'r4', full_name: 'Ruan Pretorius',     employee_code: 'EMP008', position: 'Housekeeping' },
    likes_count: [{ count: 9 }], comments_count: [{ count: 2 }],
  },
  {
    id: 'mock-5',
    message: 'Zanele, your customer service today was world-class. You noticed the elderly couple struggling with their luggage and immediately stepped in without being asked. That is true hospitality.',
    badge: 'Customer Excellence',
    hotel: 'demo',
    created_at: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    sender:   { id: 's5', full_name: 'Pieter Engelbrecht', employee_code: 'EMP009', position: 'Duty Manager' },
    receiver: { id: 'r5', full_name: 'Zanele Mokoena',     employee_code: 'EMP010', position: 'Bellhop' },
    likes_count: [{ count: 15 }], comments_count: [{ count: 6 }],
  },
  {
    id: 'mock-6',
    message: 'Incredible work pulling the team together during the power outage last night. You kept guests calm, coordinated with maintenance and ensured every room was checked. Real leadership under pressure.',
    badge: 'Team Player',
    hotel: 'demo',
    created_at: new Date(Date.now() - 30 * 60 * 60_000).toISOString(),
    sender:   { id: 's6', full_name: 'Lerato Dlamini',     employee_code: 'EMP002', position: 'Guest Relations' },
    receiver: { id: 'r6', full_name: 'Keamogetswe Tau',    employee_code: 'EMP011', position: 'Night Shift Supervisor' },
    likes_count: [{ count: 21 }], comments_count: [{ count: 8 }],
  },
  {
    id: 'mock-7',
    message: 'Lungelo, thank you for mentoring the two new waiters this week. You shared your knowledge so generously and they are already performing well because of your guidance. You make the whole team better.',
    badge: 'Leadership',
    hotel: 'demo',
    created_at: new Date(Date.now() - 36 * 60 * 60_000).toISOString(),
    sender:   { id: 's7', full_name: 'Ayanda Khumalo',     employee_code: 'EMP006', position: 'Breakfast Attendant' },
    receiver: { id: 'r7', full_name: 'Lungelo Zulu',       employee_code: 'EMP012', position: 'Head Waiter' },
    likes_count: [{ count: 6 }], comments_count: [{ count: 0 }],
  },
  {
    id: 'mock-8',
    message: 'Your idea to create a welcome card for long-stay guests was brilliant! Three guests personally mentioned it in their reviews this month. You saw an opportunity to delight and you ran with it.',
    badge: 'Innovation',
    hotel: 'demo',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    sender:   { id: 's8', full_name: 'Sipho Mahlangu',     employee_code: 'EMP004', position: 'Senior Concierge' },
    receiver: { id: 'r8', full_name: 'Chanel Mostert',     employee_code: 'EMP013', position: 'Front Desk Agent' },
    likes_count: [{ count: 11 }], comments_count: [{ count: 4 }],
  },
  {
    id: 'mock-9',
    message: 'Precious, you handled the group booking complaint with total professionalism and turned an unhappy client into a loyal one. Your empathy and problem-solving saved a key account for the hotel.',
    badge: 'Customer Excellence',
    hotel: 'demo',
    created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60_000).toISOString(),
    sender:   { id: 's9', full_name: 'Johan van der Berg', employee_code: 'EMP005', position: 'F&B Supervisor' },
    receiver: { id: 'r9', full_name: 'Precious Ndlovu',    employee_code: 'EMP014', position: 'Reservations Agent' },
    likes_count: [{ count: 18 }], comments_count: [{ count: 7 }],
  },
  {
    id: 'mock-10',
    message: "Thank you for covering two extra shifts this week without a single complaint. Your dedication and positive attitude kept the spa running smoothly and the team morale high. You are truly valued.",
    badge: 'Going the Extra Mile',
    hotel: 'demo',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
    sender:   { id: 's10', full_name: 'Thandi Nkosi',      employee_code: 'EMP003', position: 'HR Manager' },
    receiver: { id: 'r10', full_name: 'Dirk Visser',       employee_code: 'EMP015', position: 'Spa Therapist' },
    likes_count: [{ count: 14 }], comments_count: [{ count: 3 }],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBadgeConfig(badge: string) {
  return (
    RECOGNITION_BADGES.find((b) => b.value === badge) ?? { value: badge, emoji: '🏅', color: '#94a3b8' }
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Static mock card (no DB hooks) ──────────────────────────────────────────

const REACTIONS = [
  { emoji: '❤️', label: 'Like' },
  { emoji: '😊', label: 'Smile' },
  { emoji: '👍', label: 'Thumbs up' },
];

function MockCard({ item }: { item: RecognitionFeedItem }) {
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({
    '❤️': 0, '😊': 0, '👍': 0,
  });

  const badge        = getBadgeConfig(item.badge);
  const likeCount    = item.likes_count?.[0]?.count ?? 0;
  const commentCount = item.comments_count?.[0]?.count ?? 0;

  const toggleReaction = (emoji: string) => {
    const active = reactions[emoji];
    setReactions((prev) => ({ ...prev, [emoji]: !active }));
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + (active ? -1 : 1) }));
  };

  return (
    <View style={ms.card}>

      {/* Receiver row (person being recognised) */}
      <View style={ms.senderRow}>
        <View style={ms.avatar}>
          <Text style={ms.avatarText}>{getInitials(item.receiver.full_name)}</Text>
        </View>
        <View style={ms.senderInfo}>
          <Text style={ms.senderName}>{item.receiver.full_name}</Text>
          {item.receiver.position ? <Text style={ms.senderTitle}>{item.receiver.position}</Text> : null}
        </View>
        <Text style={ms.timeAgo}>{relativeTime(item.created_at)}</Text>
      </View>

      {/* Badge */}
      <View style={[ms.badgePill, { backgroundColor: badge.color + '18' }]}>
        <Text style={ms.badgeEmoji}>{badge.emoji}</Text>
        <Text style={[ms.badgeText, { color: badge.color }]}>{item.badge}</Text>
      </View>

      {/* Given by row (sender) */}
      <View style={ms.recipientCard}>
        <Ionicons name="star" size={15} color={PURPLE} />
        <Text style={ms.recognisingLabel}> Given by </Text>
        <Text style={ms.recipientName}>{item.sender.full_name}</Text>
      </View>

      {/* Message */}
      <Text style={ms.message}>{item.message}</Text>

      {/* Reaction pills + logo row */}
      <View style={ms.reactionRow}>
        {REACTIONS.map(({ emoji }) => {
          const active = reactions[emoji];
          const count  = counts[emoji] ?? 0;
          return (
            <Pressable
              key={emoji}
              onPress={() => toggleReaction(emoji)}
              style={[ms.reactionBtn, active && ms.reactionBtnActive]}
            >
              <Text style={ms.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[ms.reactionCount, active && { color: PURPLE }]}>{count}</Text>
              )}
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Image
          source={require('../../assets/IndabaCaresLogo.png')}
          style={ms.cardLogo}
          resizeMode="contain"
        />
      </View>

      {/* Date */}
      <Text style={ms.dateText}>{fullDateTime(item.created_at)}</Text>
    </View>
  );
}

const ms = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PURPLE_SOFT,
    marginBottom: 14,
    padding: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  senderRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 14, fontWeight: '700', color: PURPLE },
  senderInfo:  { flex: 1, marginLeft: 10 },
  senderName:  { fontSize: 15, fontWeight: '700', color: '#1e1b4b' },
  senderTitle: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  timeAgo:     { fontSize: 11, color: '#94a3b8' },

  badgePill:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  badgeEmoji:  { fontSize: 14 },
  badgeText:   { fontSize: 12, fontWeight: '700', marginLeft: 5 },

  recipientCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f7ff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  recognisingLabel: { fontSize: 13, color: '#64748b' },
  avatarXs:         { width: 22, height: 22, borderRadius: 11, backgroundColor: PURPLE_SOFT, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  avatarXsText:     { fontSize: 9, fontWeight: '700', color: PURPLE },
  recipientName:    { fontSize: 13, fontWeight: '700', color: '#1e1b4b' },
  recipientTitle:   { fontSize: 12, color: '#94a3b8', flex: 1 },

  message: { fontSize: 14, lineHeight: 22, color: '#334155', marginBottom: 4 },

  reactionRow:       { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 2 },
  reactionBtn:       { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9' },
  reactionBtnActive: { backgroundColor: PURPLE_SOFT, borderWidth: 1, borderColor: PURPLE + '40' },
  reactionEmoji:     { fontSize: 14 },
  reactionCount:     { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },

  dateText: { fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 12 },
  divider:  { height: 1, backgroundColor: '#f1f5f9', marginBottom: 4 },

  cardLogo: { width: 120, height: 40 },

  actionBar: { flexDirection: 'row', paddingTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  actionText: { marginLeft: 6, fontSize: 13, fontWeight: '500', color: '#94a3b8' },

});

// ─── Screen ───────────────────────────────────────────────────────────────────

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
  const liveRecognitions  = data?.pages.flatMap((page) => page) ?? [];
  const isMock            = liveRecognitions.length === 0;
  const feedItems         = isMock ? MOCK : liveRecognitions;

  const handleRefresh = useCallback(() => {
    resetNewFeedItems();
    refetch();
  }, [refetch, resetNewFeedItems]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F2', padding: 16, paddingTop: 8 }}>
          <FeedHeader />
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PURPLE }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>
        <FeedHeader />
        <NewItemsBanner onRefresh={handleRefresh} />
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            isMock
              ? <MockCard item={item as RecognitionFeedItem} />
              : <RecognitionCard recognition={item as any} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
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
