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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1,  employee_id: 'm1',  full_name: 'Lerato Dlamini',      employee_code: 'EMP002', total_points: 3840, points_balance: 3840, job_title: 'Guest Relations',        avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',  movement_delta:  2 },
  { rank: 2,  employee_id: 'm2',  full_name: 'Sipho Mahlangu',      employee_code: 'EMP004', total_points: 3510, points_balance: 3510, job_title: 'Senior Concierge',       avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',    movement_delta:  1 },
  { rank: 3,  employee_id: 'm3',  full_name: 'Zanele Mokoena',      employee_code: 'EMP010', total_points: 3200, points_balance: 3200, job_title: 'Bellhop',                avatar_url: 'https://randomuser.me/api/portraits/women/68.jpg',  movement_delta: -1 },
  { rank: 4,  employee_id: 'm4',  full_name: 'Keamogetswe Tau',     employee_code: 'EMP011', total_points: 2980, points_balance: 2980, job_title: 'Night Shift Supervisor', avatar_url: 'https://randomuser.me/api/portraits/women/12.jpg',  movement_delta:  3 },
  { rank: 5,  employee_id: 'm5',  full_name: 'Lungelo Zulu',        employee_code: 'EMP012', total_points: 2740, points_balance: 2740, job_title: 'Head Waiter',            avatar_url: 'https://randomuser.me/api/portraits/men/75.jpg',    movement_delta:  0 },
  { rank: 6,  employee_id: 'm6',  full_name: 'Chanel Mostert',      employee_code: 'EMP013', total_points: 2520, points_balance: 2520, job_title: 'Front Desk Agent',       avatar_url: 'https://randomuser.me/api/portraits/women/55.jpg',  movement_delta: -2 },
  { rank: 7,  employee_id: 'm7',  full_name: 'Ayanda Khumalo',      employee_code: 'EMP006', total_points: 2310, points_balance: 2310, job_title: 'Breakfast Attendant',    avatar_url: 'https://randomuser.me/api/portraits/women/29.jpg',  movement_delta:  1 },
  { rank: 8,  employee_id: 'm8',  full_name: 'Ruan Pretorius',      employee_code: 'EMP008', total_points: 2100, points_balance: 2100, job_title: 'Housekeeping',           avatar_url: 'https://randomuser.me/api/portraits/men/18.jpg',    movement_delta:  0 },
  { rank: 9,  employee_id: 'm9',  full_name: 'Precious Ndlovu',     employee_code: 'EMP014', total_points: 1870, points_balance: 1870, job_title: 'Reservations Agent',     avatar_url: 'https://randomuser.me/api/portraits/women/82.jpg',  movement_delta: -1 },
  { rank: 10, employee_id: 'm10', full_name: 'Dirk Visser',         employee_code: 'EMP015', total_points: 1650, points_balance: 1650, job_title: 'Spa Therapist',          avatar_url: 'https://randomuser.me/api/portraits/men/60.jpg',    movement_delta:  2 },
];

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
  const { data: liveEntries = [], isLoading, refetch, isRefetching } = useLeaderboard(period);

  const isMock  = !isLoading && liveEntries.length === 0;
  const entries = isMock ? MOCK_ENTRIES : liveEntries;

  const topThree = entries.slice(0, 3) as LeaderboardEntry[];
  const rest     = entries.slice(3)   as LeaderboardEntry[];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>

      {/* ── Frozen purple header ─────────────────────────────── */}
      <View style={styles.header}>
        {isLoading ? (
          <View style={styles.loadingInner}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          </View>
        ) : (
          <TopThreePodium entries={topThree} />
        )}
        <PeriodTabs value={period} onChange={setPeriod} />
      </View>

      {/* ── Scrollable cards list ────────────────────────────── */}
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
            {!isLoading && entries.length > 0 && <MyRankStrip entries={entries} />}
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
          !isLoading && !isMock ? (
            <EmptyState
              icon="🏆"
              title="No rankings yet"
              description="Start recognizing colleagues to earn points and appear here!"
            />
          ) : null
        }
      />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PURPLE,
  },

  screen: {
    flex: 1,
    backgroundColor: '#F2F2F2',
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
