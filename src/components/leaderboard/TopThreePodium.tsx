import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployee } from '@/providers/EmployeeContext';
import type { LeaderboardEntry } from '@/api/leaderboard-service';

const ACCENT       = '#CE21FB';
const BADGE_GOLD   = '#F5C518';
const BADGE_SILVER = '#A8A9AD';
const BADGE_BRONZE = '#CD7F32';

interface TopThreePodiumProps {
  entries: LeaderboardEntry[];
}

// ─── Single card ─────────────────────────────────────────────────────────────

interface CardProps {
  entry?: LeaderboardEntry;
  rank: 1 | 2 | 3;
  isMe?: boolean;
}

function PodiumCard({ entry, rank, isMe }: CardProps) {
  const isCenter   = rank === 1;
  const avatarSize = isCenter ? 80 : 70;
  const ringSize   = avatarSize + 8;
  const badgeSize  = isCenter ? 24 : 20;
  const badgeColor = rank === 1 ? BADGE_GOLD : rank === 2 ? BADGE_SILVER : BADGE_BRONZE;
  const ringColor  = isMe ? ACCENT : 'rgba(255,255,255,0.55)';

  return (
    <View style={[styles.card, isCenter && styles.cardCenter]}>

      {/* Avatar + overlays */}
      <View style={{ position: 'relative', alignSelf: 'center', width: ringSize, height: ringSize }}>

        {/* Ring */}
        <View
          style={[
            styles.avatarRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: ringColor,
              borderWidth: isMe ? 3 : 2,
            },
          ]}
        >
          {entry?.avatar_url ? (
            <Image
              source={{ uri: entry.avatar_url }}
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.placeholder,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Ionicons name="person" size={avatarSize * 0.48} color="rgba(255,255,255,0.5)" />
            </View>
          )}
        </View>

        {/* Rank badge — top-right edge */}
        <View
          style={[
            styles.rankBadge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: badgeColor },
          ]}
        >
          <Text style={[styles.rankText, { fontSize: isCenter ? 11 : 9 }]}>{rank}</Text>
        </View>

        {/* Points pill — bottom-right edge */}
        {entry && (
          <View style={styles.pointsPill}>
            <Text style={styles.pointsStar}>⭐</Text>
            <Text style={styles.pointsNum}>{entry.total_points >= 1000
              ? `${(entry.total_points / 1000).toFixed(1)}k`
              : entry.total_points}
            </Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[styles.name, isCenter && styles.nameLarge]} numberOfLines={2}>
        {entry?.full_name ?? '—'}
      </Text>

      {/* Job title */}
      <Text style={[styles.jobTitle, isCenter && styles.jobTitleLarge]} numberOfLines={1}>
        {entry?.job_title ?? (entry ? '' : 'No ranking yet')}
      </Text>

    </View>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

export function TopThreePodium({ entries }: TopThreePodiumProps) {
  const { employee } = useEmployee();
  const isMe = (e?: LeaderboardEntry) => !!e && e.employee_id === employee?.employee_id;

  return (
    <View style={styles.container}>

      {/* Row 1 — #1 centred and largest */}
      <View style={styles.topRow}>
        <PodiumCard entry={entries[0]} rank={1} isMe={isMe(entries[0])} />
      </View>

      {/* Row 2 — #2 left, #3 right */}
      <View style={styles.bottomRow}>
        <PodiumCard entry={entries[1]} rank={2} isMe={isMe(entries[1])} />
        <PodiumCard entry={entries[2]} rank={3} isMe={isMe(entries[2])} />
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },

  topRow: {
    alignItems: 'center',
    marginBottom: 6,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },

  card: {
    alignItems: 'center',
    width: 120,
  },

  cardCenter: {
    width: 130,
  },

  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  // Rank number — top-right edge of avatar ring
  rankBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  rankText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // Points pill — bottom-right edge of avatar ring
  pointsPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 2,
  },
  pointsStar: { fontSize: 9 },
  pointsNum:  { fontSize: 9, fontWeight: '800', color: '#fff', marginLeft: 2 },

  name: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  nameLarge: {
    fontSize: 14,
    lineHeight: 19,
  },

  jobTitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  jobTitleLarge: {
    fontSize: 11,
  },
});
