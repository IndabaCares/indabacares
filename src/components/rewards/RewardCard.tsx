import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Reward } from '@/api/reward-service';

const PURPLE = '#7B1FA2';

// Distinct placeholder colours — cycles by card id
const PLACEHOLDER_COLORS = [
  '#7B1FA2',
  '#5B21B6',
  '#1D4ED8',
  '#0F766E',
  '#B45309',
  '#BE185D',
];

const { width: SCREEN_W } = Dimensions.get('window');
export const CARD_WIDTH  = (SCREEN_W - 16 * 2 - 14) / 2;
const        CARD_HEIGHT = CARD_WIDTH * 1.4;

interface RewardCardProps {
  reward: Reward;
  pointsBalance: number;
  onPress: () => void;
}

export function RewardCard({ reward, pointsBalance, onPress }: RewardCardProps) {
  const outOfStock = reward.stock <= 0;
  const canAfford  = pointsBalance >= reward.points_required;
  const lowStock   = !outOfStock && reward.stock <= 5;

  const placeholderColor =
    PLACEHOLDER_COLORS[parseInt(reward.id, 10) % PLACEHOLDER_COLORS.length] ?? PURPLE;

  return (
    <Pressable
      onPress={outOfStock ? undefined : onPress}
      style={({ pressed }) => [
        styles.card,
        outOfStock && styles.cardDisabled,
        pressed && styles.cardPressed,
      ]}
    >
      {/* ── Background ─────────────────────────────────────────────────── */}
      {reward.image_url ? (
        <Image
          source={{ uri: reward.image_url }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: placeholderColor, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Ionicons name="gift-outline" size={52} color="rgba(255,255,255,0.3)" />
        </View>
      )}

      {/* ── Bottom scrim ───────────────────────────────────────────────── */}
      <View style={styles.scrim} />

      {/* ── Top-left: Points badge ─────────────────────────────────────── */}
      <View style={[styles.pointsBadge, canAfford ? styles.pointsBadgeGreen : styles.pointsBadgeRed]}>
        <Ionicons name="cash-outline" size={20} color={canAfford ? '#16a34a' : '#db2777'} />
        <Text style={[styles.pointsLabel, { color: canAfford ? '#16a34a' : '#db2777' }]}>
          {reward.points_required}
        </Text>
      </View>

      {/* ── Top-right: Stock badge ─────────────────────────────────────── */}
      {outOfStock ? (
        <View style={[styles.badge, styles.badgeTopRight, styles.badgeDark]}>
          <Text style={styles.badgeLabelWhite}>OUT OF STOCK</Text>
        </View>
      ) : lowStock ? (
        <View style={[styles.badge, styles.badgeTopRight, styles.badgeAmber]}>
          <Ionicons name="flame" size={10} color="#92400e" />
          <Text style={[styles.badgeLabel, { color: '#92400e', marginLeft: 3 }]}>{reward.stock} left</Text>
        </View>
      ) : null}

      {/* ── Bottom: Title + affordability ──────────────────────────────── */}
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>
          {reward.title}
        </Text>
        {!outOfStock && canAfford && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="checkmark-circle" size={20} color="#86efac" />
            <Text style={[styles.subLabel, { color: '#86efac', marginLeft: 4 }]}>Can redeem</Text>
          </View>
        )}
        {!outOfStock && !canAfford && (
          <Text style={[styles.subLabel, { marginTop: 4, color: 'rgba(255,255,255,0.55)' }]}>
            Need {reward.points_required - pointsBalance} more pts
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: PURPLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDisabled: { opacity: 0.5 },
  cardPressed:  { opacity: 0.82 },

  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.5,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // Points badge — enlarged, top-left
  pointsBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  pointsBadgeGreen: { backgroundColor: 'rgba(220,252,231,0.95)' },
  pointsBadgeRed:   { backgroundColor: 'rgba(252,231,243,0.95)' },
  pointsLabel: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Stock / other badges
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTopLeft:  { top: 10, left: 10 },
  badgeTopRight: { top: 10, right: 10 },
  badgeWhite: { backgroundColor: 'rgba(255,255,255,0.92)' },
  badgePink:  { backgroundColor: 'rgba(252,231,243,0.92)' },
  badgeDark:  { backgroundColor: 'rgba(0,0,0,0.65)' },
  badgeAmber: { backgroundColor: 'rgba(254,243,199,0.95)' },

  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeLabelWhite: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#ffffff',
  },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 18,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
