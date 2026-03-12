import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useEmployee } from '@/providers/EmployeeContext';
import { type PeriodType } from '@/api/leaderboard-service';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { TopThreePodium } from '@/components/leaderboard/TopThreePodium';
import { PeriodTabs } from '@/components/leaderboard/PeriodTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntry } from '@/api/leaderboard-service';

const PURPLE = '#7B1FA2';

// ─── My rank strip ────────────────────────────────────────────────────────────

function MyRankStrip({ entries }: { entries: LeaderboardEntry[] }) {
  const { employee } = useEmployee();
  if (!employee) return null;
  const myEntry = entries.find((e) => e.employee_id === employee.employee_id);
  if (!myEntry || myEntry.rank <= 3) return null;

  return (
    <View style={styles.myRankStrip}>
      <Text style={styles.myRankLabel}>Your rank</Text>
      <Text style={styles.myRankValue}>#{myEntry.rank}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.myRankPoints}>{myEntry.total_points.toLocaleString()} pts</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const { data: entries = [], isLoading, refetch, isRefetching } = useLeaderboard(period);

  const topThree = entries.slice(0, 3) as LeaderboardEntry[];
  const rest     = entries.slice(3)   as LeaderboardEntry[];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        style={styles.list}
        data={isLoading ? [] : rest}
        keyExtractor={(item) => item.employee_id}
        renderItem={({ item }) => <LeaderboardRow entry={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />
        }
        ListHeaderComponent={
          <>
            {/* ── Purple header — always full height, mirrors profile ── */}
            <View style={styles.header}>

              {isLoading ? (
                <View style={styles.loadingInner}>
                  <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
                </View>
              ) : (
                /* Triangular podium — renders placeholders when entries are empty */
                <TopThreePodium entries={topThree} />
              )}

              {/* Period tabs live inside the header at the bottom */}
              <PeriodTabs value={period} onChange={setPeriod} />

            </View>

            {/* My rank strip below header */}
            {!isLoading && entries.length > 0 && <MyRankStrip entries={entries} />}

            {/* Divider */}
            {!isLoading && rest.length > 0 && (
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Rankings 4–{entries.length}</Text>
                <View style={styles.dividerLine} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="🏆"
              title="No rankings yet"
              description="Start recognizing colleagues to earn points and appear here!"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PURPLE,
  },

  list: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },

  listContent: {
    paddingBottom: 100,
  },

  // Matches profile header exactly — always rendered, always tall
  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },

  loadingInner: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },

  myRankStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },

  myRankLabel: {
    fontSize: 12,
    color: PURPLE,
    fontWeight: '600',
    marginRight: 6,
  },

  myRankValue: {
    fontSize: 14,
    color: '#5B21B6',
    fontWeight: '800',
  },

  myRankPoints: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: '700',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
