import React, { memo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/ui/Avatar';
import { useLikes, useToggleLike } from '@/hooks/use-likes';
import { useEmployee } from '@/providers/EmployeeContext';
import type { CelebrationFeedItem } from '@/hooks/use-celebrations';

const LOGO = require('../../../assets/usedlogo.png');

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

  const gradientColors: [string, string, string] = isBirthday
    ? ['#4a0000', '#b71c1c', '#dc2626']
    : ['#3b0764', '#6d28d9', '#7B1FA2'];

  const major = !isBirthday && milestone != null && isMajorMilestone(milestone);

  const header = isBirthday
    ? '🎉 Happy Birthday! 🎉'
    : `${ordinal(milestone ?? 1)} Work Anniversary 🏆`;

  const dept = employee.department ?? employee.position ?? null;
  const firstName = employee.full_name.split(' ')[0];

  const bodyText = isBirthday
    ? `Happy Birthday to ${employee.full_name}, we hope you have an awesome day full of fun, love and celebrations.`
    : major
      ? `${employee.full_name} is celebrating ${milestone} incredible year${(milestone ?? 1) !== 1 ? 's' : ''} with the team. What an achievement!`
      : `${employee.full_name} is celebrating ${milestone} year${(milestone ?? 1) !== 1 ? 's' : ''} with the team today.`;

  // Heart — uses likes (no balance deduction)
  const { data: likes = [] } = useLikes(celebration.id);
  const toggleLike           = useToggleLike(celebration.id);
  const myLike               = likes.find((l) => l.employee_id === currentEmployee?.employee_id);
  const liked                = !!myLike;
  const likeCount            = likes.length;

  const handleHeart = () => toggleLike.mutate({ likeId: myLike?.id ?? null });

  // ── Pulse animation on header ──────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue:         1.07,
          duration:        700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue:         1,
          duration:        700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* ── Logo watermark ────────────────────────────────── */}
      <Image source={LOGO} style={s.logo} resizeMode="contain" />

      {/* ── Animated header ───────────────────────────────── */}
      <Animated.Text
        style={[s.header, { transform: [{ scale: pulseAnim }] }]}
      >
        {header}
      </Animated.Text>

      {/* ── Person row: avatar · name · dept ──────────────── */}
      <View style={s.personRow}>
        <Avatar name={employee.full_name} size="lg" />
        <View style={s.personInfo}>
          <View style={s.nameRow}>
            <Text style={s.personName} numberOfLines={1}>
              {employee.full_name}
            </Text>
            {dept ? (
              <Text style={s.personDept} numberOfLines={1}> · {dept}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Body text ─────────────────────────────────────── */}
      <Text style={s.body}>{bodyText}</Text>

      {/* ── Milestone badge ───────────────────────────────── */}
      {major && (
        <View style={s.milestoneBadge}>
          <Text style={s.milestoneText}>{milestone}-Year Milestone</Text>
        </View>
      )}

      {/* ── Heart reaction ────────────────────────────────── */}
      <View style={s.heartRow}>
        <TouchableOpacity
          onPress={handleHeart}
          disabled={toggleLike.isPending}
          style={s.heartBtn}
          activeOpacity={0.7}
        >
          <Text style={s.heartEmoji}>{liked ? '❤️' : '🤍'}</Text>
          {likeCount > 0 && (
            <Text style={s.heartCount}>{likeCount}</Text>
          )}
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: '#7f0000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },

  // Logo
  logo: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    width: 70,
    height: 70,
    opacity: 0.28,
    tintColor: '#ffffff',
  },

  // Header
  header: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Person row
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  personInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  personDept: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },

  // Body
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#fff',
    marginBottom: 14,
  },

  // Milestone badge
  milestoneBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
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
    fontSize: 26,
  },
  heartCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff6b6b',
  },
});
