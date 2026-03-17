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

const MOCK_EMPLOYEES: LeaderboardEntry[] = [
  { rank: 1,  employee_id: 'm1',  full_name: 'Lerato Dlamini',      employee_code: 'EMP002', total_points: 3840, points_balance: 3840, job_title: 'Guest Relations',        avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',  movement_delta:  2, is_manager: false },
  { rank: 2,  employee_id: 'm2',  full_name: 'Sipho Mahlangu',      employee_code: 'EMP004', total_points: 3510, points_balance: 3510, job_title: 'Senior Concierge',       avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',    movement_delta:  1, is_manager: false },
  { rank: 3,  employee_id: 'm3',  full_name: 'Zanele Mokoena',      employee_code: 'EMP010', total_points: 3200, points_balance: 3200, job_title: 'Bellhop',                avatar_url: 'https://randomuser.me/api/portraits/women/68.jpg',  movement_delta: -1, is_manager: false },
  { rank: 4,  employee_id: 'm4',  full_name: 'Keamogetswe Tau',     employee_code: 'EMP011', total_points: 2980, points_balance: 2980, job_title: 'Night Shift Supervisor', avatar_url: 'https://randomuser.me/api/portraits/women/12.jpg',  movement_delta:  3, is_manager: false },
  { rank: 5,  employee_id: 'm5',  full_name: 'Lungelo Zulu',        employee_code: 'EMP012', total_points: 2740, points_balance: 2740, job_title: 'Head Waiter',            avatar_url: 'https://randomuser.me/api/portraits/men/75.jpg',    movement_delta:  0, is_manager: false },
  { rank: 6,  employee_id: 'm6',  full_name: 'Chanel Mostert',      employee_code: 'EMP013', total_points: 2520, points_balance: 2520, job_title: 'Front Desk Agent',       avatar_url: 'https://randomuser.me/api/portraits/women/55.jpg',  movement_delta: -2, is_manager: false },
  { rank: 7,  employee_id: 'm7',  full_name: 'Ayanda Khumalo',      employee_code: 'EMP006', total_points: 2310, points_balance: 2310, job_title: 'Breakfast Attendant',    avatar_url: 'https://randomuser.me/api/portraits/women/29.jpg',  movement_delta:  1, is_manager: false },
  { rank: 8,  employee_id: 'm8',  full_name: 'Ruan Pretorius',      employee_code: 'EMP008', total_points: 2100, points_balance: 2100, job_title: 'Housekeeping',           avatar_url: 'https://randomuser.me/api/portraits/men/18.jpg',    movement_delta:  0, is_manager: false },
  { rank: 9,  employee_id: 'm9',  full_name: 'Precious Ndlovu',     employee_code: 'EMP014', total_points: 1870, points_balance: 1870, job_title: 'Reservations Agent',     avatar_url: 'https://randomuser.me/api/portraits/women/82.jpg',  movement_delta: -1, is_manager: false },
  { rank: 10, employee_id: 'm10', full_name: 'Dirk Visser',         employee_code: 'EMP015', total_points: 1650, points_balance: 1650, job_title: 'Spa Therapist',          avatar_url: 'https://randomuser.me/api/portraits/men/60.jpg',    movement_delta:  2, is_manager: false },
];

const MOCK_MANAGEMENT: LeaderboardEntry[] = [
  { rank: 1, employee_id: 'mgr1', full_name: 'Thabo Nkosi',        employee_code: 'MGR001', total_points: 4200, points_balance: 4200, job_title: 'General Manager',       avatar_url: 'https://randomuser.me/api/portraits/men/41.jpg',    movement_delta:  0, is_manager: true },
  { rank: 2, employee_id: 'mgr2', full_name: 'Liezel van der Berg', employee_code: 'MGR002', total_points: 3900, points_balance: 3900, job_title: 'F&B Manager',           avatar_url: 'https://randomuser.me/api/portraits/women/36.jpg',  movement_delta:  1, is_manager: true },
  { rank: 3, employee_id: 'mgr3', full_name: 'Bongani Sithole',    employee_code: 'MGR003', total_points: 3450, points_balance: 3450, job_title: 'Rooms Division Manager', avatar_url: 'https://randomuser.me/api/portraits/men/54.jpg',    movement_delta: -1, is_manager: true },
  { rank: 4, employee_id: 'mgr4', full_name: 'Nomsa Dube',         employee_code: 'MGR004', total_points: 3100, points_balance: 3100, job_title: 'HR Manager',             avatar_url: 'https://randomuser.me/api/portraits/women/63.jpg',  movement_delta:  2, is_manager: true },
  { rank: 5, employee_id: 'mgr5', full_name: 'Pieter Venter',      employee_code: 'MGR005', total_points: 2800, points_balance: 2800, job_title: 'Revenue Manager',        avatar_url: 'https://randomuser.me/api/portraits/men/22.jpg',    movement_delta:  0, is_manager: true },
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
  const { data: liveEntries = [], isLoading, refetch, isRefetching } = useLeaderboard('monthly');

  const isMock      = !isLoading && liveEntries.length === 0;
  const allEntries  = isMock ? [...MOCK_EMPLOYEES, ...MOCK_MANAGEMENT] : liveEntries;

  // Podium always shows top 3 employees only
  const employees   = allEntries.filter((e) => !e.is_manager);
  const management  = allEntries.filter((e) => e.is_manager);
  const topThree    = employees.slice(0, 3) as LeaderboardEntry[];

  // List shows the active tab (employees skip top 3 since they're in podium)
  const isManagement = period === 'annual';
  const listEntries  = isManagement ? management : employees.slice(3);
  const rest         = listEntries as LeaderboardEntry[];

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
      </View>

      {/* ── Period pill tabs (below header) ──────────────────── */}
      <PeriodTabs value={period} onChange={setPeriod} />

      {/* ── Scrollable cards list ────────────────────────────── */}
      <FlatList
        style={styles.list}
        data={isLoading ? [] : rest}
        keyExtractor={(item) => item.employee_id}
        renderItem={({ item, index }) => (
          <LeaderboardRow
            entry={item}
            isFirst={index === 0}
            isLast={index === rest.length - 1}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />
        }
        ListHeaderComponent={
          <>
            {!isLoading && !isManagement && employees.length > 0 && <MyRankStrip entries={employees} />}
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 6,
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

  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
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
