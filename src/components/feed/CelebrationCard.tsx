import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useLikes, useToggleLike } from '@/hooks/use-likes';
import { useEmployee } from '@/providers/EmployeeContext';
import type { CelebrationFeedItem } from '@/hooks/use-celebrations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function isMajorMilestone(years: number): boolean {
  return [1, 3, 5, 10, 15, 20, 25, 30].includes(years);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  celebration: CelebrationFeedItem;
}

export const CelebrationCard = memo(function CelebrationCard({ celebration }: Props) {
  const { employee: currentEmployee } = useEmployee();
  const { type, milestone, employee } = celebration;
  const isBirthday = type === 'birthday';

  const accentColor = isBirthday ? '#E91E8C' : '#7B1FA2';
  const bgColor     = isBirthday ? '#FFF0F8' : '#F3E5F5';
  const major       = !isBirthday && milestone != null && isMajorMilestone(milestone);

  const header = isBirthday
    ? 'Happy Birthday! 🎂'
    : `${ordinal(milestone ?? 1)} Work Anniversary 🏆`;

  const body = isBirthday
    ? `${employee.full_name} is celebrating their birthday today!`
    : major
      ? `${employee.full_name} is celebrating ${milestone} incredible year${(milestone ?? 1) !== 1 ? 's' : ''} with the team. What an achievement!`
      : `${employee.full_name} is celebrating ${milestone} year${(milestone ?? 1) !== 1 ? 's' : ''} with the team today.`;

  const dept = employee.department ?? employee.position ?? null;

  // Heart — uses the likes system (no reaction balance deduction)
  const { data: likes = [] } = useLikes(celebration.id);
  const toggleLike           = useToggleLike(celebration.id);
  const myLike               = likes.find((l) => l.employee_id === currentEmployee?.employee_id);
  const liked                = !!myLike;
  const likeCount            = likes.length;

  const handleHeart = () => toggleLike.mutate({ likeId: myLike?.id ?? null });

  return (
    <View style={[s.card, { backgroundColor: bgColor }]}>

      {/* ── Header ──────────────────────────────────────── */}
      <Text style={[s.header, { color: accentColor }]}>{header}</Text>

      {/* ── Person row ──────────────────────────────────── */}
      <View style={s.personRow}>
        <Avatar name={employee.full_name} size="md" />
        <View style={s.personInfo}>
          <Text style={[s.personName, { color: accentColor }]}>{employee.full_name}</Text>
          {dept ? (
            <Text style={s.personDept}>{dept}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Body text ───────────────────────────────────── */}
      <Text style={s.body}>{body}</Text>

      {/* ── Milestone badge ─────────────────────────────── */}
      {major && (
        <View style={[s.milestoneBadge, { backgroundColor: accentColor }]}>
          <Text style={s.milestoneText}>{milestone}-Year Milestone</Text>
        </View>
      )}

      {/* ── Heart reaction ──────────────────────────────── */}
      <View style={s.heartRow}>
        <TouchableOpacity
          onPress={handleHeart}
          disabled={toggleLike.isPending}
          style={s.heartBtn}
          activeOpacity={0.7}
        >
          <Text style={s.heartEmoji}>{liked ? '❤️' : '🤍'}</Text>
          {likeCount > 0 && (
            <Text style={[s.heartCount, { color: accentColor }]}>{likeCount}</Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({});

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header
  header: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },

  // Person row
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
  },
  personDept: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },

  // Body
  body: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },

  // Milestone badge
  milestoneBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Heart
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  heartEmoji: {
    fontSize: 24,
  },
  heartCount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
