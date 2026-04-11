import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const { type, milestone, employee } = celebration;
  const firstName = employee.full_name.split(' ')[0];
  const isBirthday = type === 'birthday';

  const emoji      = isBirthday ? '🎂' : '🏆';
  const accentColor = isBirthday ? '#E91E8C' : '#7B1FA2';
  const bgColor     = isBirthday ? '#FFF0F8' : '#F3E5F5';
  const major       = !isBirthday && milestone != null && isMajorMilestone(milestone);

  const title = isBirthday
    ? `Happy Birthday, ${firstName}! 🎉`
    : `${ordinal(milestone ?? 1)} Work Anniversary 🏆`;

  const body = isBirthday
    ? `Wishing ${employee.full_name} a wonderful birthday today. Show them some love!`
    : major
      ? `${employee.full_name} is celebrating ${milestone} incredible year${(milestone ?? 1) !== 1 ? 's' : ''} with the team. What an achievement!`
      : `${employee.full_name} is celebrating ${milestone} year${(milestone ?? 1) !== 1 ? 's' : ''} with the team today.`;

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {major && (
            <View style={[styles.milestoneBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.milestoneText}>
                {milestone}-Year Milestone
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius:     16,
    borderLeftWidth:  4,
    marginHorizontal: 0,
    marginBottom:     12,
    padding:          16,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.08,
    shadowRadius:     8,
    elevation:        3,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           12,
  },
  iconWrap: {
    width:        48,
    height:       48,
    borderRadius: 24,
    alignItems:   'center',
    justifyContent: 'center',
    flexShrink:   0,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap:  4,
  },
  title: {
    fontSize:   15,
    fontWeight: '700',
    lineHeight: 20,
  },
  body: {
    fontSize:   13,
    color:      '#475569',
    lineHeight: 18,
  },
  milestoneBadge: {
    alignSelf:    'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical:   3,
    marginTop:    6,
  },
  milestoneText: {
    fontSize:   11,
    fontWeight: '700',
    color:      '#ffffff',
    letterSpacing: 0.3,
  },
});
