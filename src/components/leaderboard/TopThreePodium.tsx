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
  const avatarSize = isCenter ? 88 : 64;
  const badgeSize  = isCenter ? 26 : 20;
  const badgeColor = rank === 1 ? BADGE_GOLD : rank === 2 ? BADGE_SILVER : BADGE_BRONZE;
  const ringColor  = isMe ? ACCENT : 'rgba(255,255,255,0.55)';

  return (
    <View style={[styles.card, isCenter && styles.cardCenter]}>

      {/* Avatar / placeholder */}
      <View style={{ position: 'relative', alignSelf: 'center' }}>
        <View
          style={[
            styles.avatarRing,
            {
              width:        avatarSize + 10,
              height:       avatarSize + 10,
              borderRadius: (avatarSize + 10) / 2,
              borderColor:  ringColor,
              borderWidth:  isMe ? 3 : 2,
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
            /* Placeholder circle — always visible */
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

        {/* Rank badge */}
        <View
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: badgeColor },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: isCenter ? 12 : 10 }]}>{rank}</Text>
        </View>
      </View>

      {/* Full name */}
      <Text style={[styles.name, isCenter && styles.nameLarge]} numberOfLines={2}>
        {entry?.full_name ?? '—'}
      </Text>

      {/* Job title */}
      <Text style={[styles.jobTitle, isCenter && styles.jobTitleLarge]} numberOfLines={1}>
        {entry?.job_title ?? (entry ? '' : 'No ranking yet')}
      </Text>

      {/* Points — only when data present */}
      {entry && (
        <View style={styles.pointsRow}>
          <Text style={[styles.points, isCenter && styles.pointsLarge]}>
            {entry.total_points.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, marginLeft: 3 }}>⭐</Text>
        </View>
      )}

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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },

  topRow: {
    alignItems: 'center',
    marginBottom: 14,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  card: {
    alignItems: 'center',
    flex: 1,
  },

  cardCenter: {
    flex: 0,
    width: 170,
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

  badge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  badgeText: {
    color: '#ffffff',
    fontWeight: '800',
  },

  name: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 17,
  },

  nameLarge: {
    fontSize: 15,
    lineHeight: 20,
  },

  jobTitle: {
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '400',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },

  jobTitleLarge: {
    fontSize: 12,
  },

  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  points: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },

  pointsLarge: {
    fontSize: 14,
  },
});
