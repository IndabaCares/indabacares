import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/utils/image';
import { useQuery } from '@tanstack/react-query';
import { useReactionBalance, REACTION_TOTALS } from '@/hooks/use-reaction-balance';
import { useRecognitionBalance, MONTHLY_RECOGNITION_LIMIT } from '@/hooks/use-recognition-balance';
import { useUserBadges } from '@/hooks/use-user-badges';
import { QUERY_KEYS } from '@/lib/constants';

// ─── Hotel background images ──────────────────────────────────────────────────

const HOTEL_BACKGROUNDS: Record<string, ReturnType<typeof require>> = {
  'Indaba Hotel':                  require('../../assets/Indaba-long.jpg'),
  'Indaba Lodge Gaborone':         require('../../assets/ILG.jpg'),
  'Indaba Lodge Richards Bay':     require('../../assets/ILRB.jpg'),
};
const DEFAULT_BG = require('../../assets/Indaba-long.jpg');

// ─── Brand colours ────────────────────────────────────────────────────────────

const PURPLE     = '#7B1FA2';
const PURPLE_MID = '#9C27B0';
const ACCENT     = '#CE21FB';
const LIGHT_TEXT = '#EDE7F6';

// ─── Status tiers ─────────────────────────────────────────────────────────────

const STATUS_TIERS = [
  { label: 'Gold',   min: 50, icon: 'trophy' as const, color: '#fbbf24' },
  { label: 'Silver', min: 20, icon: 'trophy' as const, color: '#cbd5e1' },
  { label: 'Bronze', min: 5,  icon: 'trophy' as const, color: '#cd7f32' },
];

function getStatus(weeklyRecognitions: number) {
  for (const tier of STATUS_TIERS) {
    if (weeklyRecognitions >= tier.min) return tier;
  }
  return { label: 'Unranked', icon: 'trophy-outline' as const, color: 'rgba(255,255,255,0.4)' };
}

// ─── Dropdown menu items ──────────────────────────────────────────────────────

const MENU_ITEMS = [
  { label: 'Indaba Cares',    icon: 'ribbon-outline'  as const, route: '/(screens)/csr-hotels' },
  { label: 'Know your team',  icon: 'people-outline'  as const, route: '/(screens)/team'        },
  { label: "FAQ's",           icon: 'help-circle-outline' as const, route: '/(screens)/faq'     },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { employee, clearEmployee } = useEmployee();

  const [photoUrl,   setPhotoUrl] = useState<string | null>(null);
  const [uploading,  setUploading] = useState(false);
  const [activeTab,  setActiveTab] = useState<'balance' | 'utilise' | 'achieve'>('balance');
  const [menuOpen,   setMenuOpen]  = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: QUERY_KEYS.employeeProfile(employee?.employee_id ?? ''),
    queryFn: async () => {
      const { data } = await supabase
        .from('employees')
        .select('points_balance, job_title, position, photo_url')
        .eq('id', employee!.employee_id)
        .single();
      return data as { points_balance: number; job_title: string | null; position: string | null; photo_url: string | null } | null;
    },
    enabled: !!employee,
    staleTime: 60_000,
  });

  // Seed photo URL from fetched data (only if not already set by an upload)
  useEffect(() => {
    if (profileData?.photo_url && !photoUrl) setPhotoUrl(profileData.photo_url);
  }, [profileData?.photo_url]);

  const pointsBalance = profileData?.points_balance ?? null;
  const pointsLoading = profileLoading;
  const jobTitle      = profileData?.position ?? profileData?.job_title ?? null;

  const { data: reactionBalance,     isLoading: reactionLoading }       = useReactionBalance();
  const { data: recognitionRemaining, isLoading: recognitionLoading }   = useRecognitionBalance();
  const { data: badgeCount,           isLoading: badgesLoading }        = useUserBadges();

  // Number of recognitions given this month (used for status tier calculation).
  // Only computed once recognitionRemaining has resolved to avoid "Unranked" flash.
  const recognitionsGiven = recognitionLoading
    ? null
    : MONTHLY_RECOGNITION_LIMIT - (recognitionRemaining ?? MONTHLY_RECOGNITION_LIMIT);

  // Days until end-of-month reset
  const _now          = new Date();
  const _endOfMonth   = new Date(_now.getFullYear(), _now.getMonth() + 1, 0);
  const daysUntilReset = Math.max(1, Math.ceil((_endOfMonth.getTime() - _now.getTime()) / 86_400_000));

  if (!employee) return null;

  // ── Initials fallback ──────────────────────────────────────────────────────
  const initials = employee.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── Stats row ──────────────────────────────────────────────────────────────
  const stats = [
    { icon: '❤️', value: reactionBalance?.hearts_remaining ?? REACTION_TOTALS.heart    },
    { icon: '😊', value: reactionBalance?.smiles_remaining ?? REACTION_TOTALS.smile    },
    { icon: '👍', value: reactionBalance?.thumbs_remaining ?? REACTION_TOTALS.thumbs_up },
  ];

  const remainingReactionPts =
    (reactionBalance?.hearts_remaining  ?? REACTION_TOTALS.heart)     +
    (reactionBalance?.smiles_remaining  ?? REACTION_TOTALS.smile)     +
    (reactionBalance?.thumbs_remaining  ?? REACTION_TOTALS.thumbs_up);

  // ── Photo upload ───────────────────────────────────────────────────────────

  async function handleUploadFromSource(source: 'camera' | 'library') {
    if (!employee) return;

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to choose a photo.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.8,
      });
    }

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;

    // Snapshot current photo so we can restore it on failure
    const previousPhotoUrl = photoUrl;

    // Optimistic preview
    setPhotoUrl(uri);
    setUploading(true);

    try {
      const { publicUrl } = await uploadImage(
        uri,
        'avatars',
        `${employee.employee_id}/avatar`,
      );

      await supabase.rpc('update_employee_avatar', { p_photo_url: publicUrl });
      setPhotoUrl(publicUrl);
    } catch (err: any) {
      // Restore the previous photo — do not leave the profile blank
      setPhotoUrl(previousPhotoUrl);
      Alert.alert('Upload Failed', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleAvatarPress() {
    Alert.alert(
      'Profile Photo',
      'Choose how to update your photo',
      [
        { text: 'Take Photo',          onPress: () => handleUploadFromSource('camera')  },
        { text: 'Choose from Library', onPress: () => handleUploadFromSource('library') },
        { text: 'Cancel',              style: 'cancel' },
      ],
      { cancelable: true },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <View style={styles.screen}>

        {/* ── Image header card ───────────────────────────────────────────── */}
        <ImageBackground
          source={HOTEL_BACKGROUNDS[employee.hotel] ?? DEFAULT_BG}
          style={styles.header}
          resizeMode="cover"
        >
          {/* Dark overlay — full height of ImageBackground */}
          <View style={styles.headerOverlay}>

          {/* Top navigation */}
          <View style={styles.topNav}>
            <Pressable
              onPress={() => setMenuOpen((o) => !o)}
              hitSlop={10}
              style={styles.navIcon}
            >
              <Ionicons
                name={menuOpen ? 'close' : 'menu'}
                size={26}
                color="#ffffff"
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(screens)/notifications')}
              hitSlop={10}
              style={styles.navIcon}
            >
              <Ionicons name="notifications-outline" size={26} color="#ffffff" />
            </Pressable>
          </View>

          {/* Profile row: avatar left, text right */}
          <View style={styles.profileRow}>

            {/* Avatar — tappable, splash style matching leaderboard podium */}
            <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
              {/* Splash layer 1 — accent blob (behind) */}
              <View style={styles.splashAccent} />
              {/* Splash layer 2 — deep purple base blob (on top) */}
              <View style={styles.splashBase} />

              {/* Photo + badges in a relative sub-container */}
              <View style={styles.photoContainer}>
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    onError={() => setPhotoUrl(null)}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.avatarSpinner}>
                    <ActivityIndicator color="#ffffff" size="small" />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color="#ffffff" />
                </View>
              </View>
            </Pressable>

            {/* Name / title / meta */}
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{employee.full_name}</Text>
              {jobTitle ? <Text style={styles.subtitle}>{jobTitle}</Text> : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{employee.hotel}</Text>
              </View>
            </View>

          </View>

          </View>{/* end headerOverlay */}

        </ImageBackground>

        {/* ── Pill tab selector — sits on the header's rounded bottom edge ── */}
        <View style={styles.tabContainer}>
          <View style={styles.tabPill}>
            {(['balance', 'utilise', 'achieve'] as const).map((tab) => {
              const active = activeTab === tab;
              const label = tab === 'balance' ? 'Balance' : tab === 'utilise' ? 'Utilise' : 'Achieve';
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <ScrollView style={styles.contentScroll} contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

          {/* ── Balance tab ─────────────────────────────────────────────── */}
          {activeTab === 'balance' && (
            <>
              {/* ── 2×2 feed-style cards ──────────────────────────────── */}
              <View style={styles.balanceFeedGrid}>

                {/* Recognition Badges */}
                <LinearGradient
                  colors={['#3b0764', '#6d28d9', '#7B1FA2']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.balanceFeedCard}
                >
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>⭐</Text>
                    <Text style={styles.balanceFeedTitle}>Recognition</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Badges Left</Text>
                  {recognitionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.balanceFeedValue}>
                      {recognitionRemaining ?? '—'} of {MONTHLY_RECOGNITION_LIMIT}
                    </Text>
                  )}
                  <View style={styles.balanceFeedTrack}>
                    <View style={[styles.balanceFeedFill, {
                      width: `${((recognitionRemaining ?? 0) / MONTHLY_RECOGNITION_LIMIT) * 100}%`,
                      backgroundColor: '#e879f9',
                    }]} />
                  </View>
                </LinearGradient>

                {/* Skills Badges */}
                <LinearGradient
                  colors={['#1e3a5f', '#1d4ed8', '#2563eb']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.balanceFeedCard}
                >
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🎓</Text>
                    <Text style={styles.balanceFeedTitle}>Skills</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Badges Left</Text>
                  <Text style={styles.balanceFeedValue}>9 of 10</Text>
                  <View style={styles.balanceFeedTrack}>
                    <View style={[styles.balanceFeedFill, { width: '90%', backgroundColor: '#93c5fd' }]} />
                  </View>
                </LinearGradient>

                {/* Emoji */}
                <LinearGradient
                  colors={['#064e3b', '#065f46', '#059669']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.balanceFeedCard}
                >
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>😀</Text>
                    <Text style={styles.balanceFeedTitle}>Emoji</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Reactions Left</Text>
                  {reactionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.balanceFeedValue}>
                      {reactionBalance
                        ? reactionBalance.hearts_remaining + reactionBalance.smiles_remaining + reactionBalance.thumbs_remaining
                        : '—'} of 100
                    </Text>
                  )}
                  <View style={styles.balanceFeedTrack}>
                    <View style={[styles.balanceFeedFill, {
                      width: reactionBalance
                        ? `${((reactionBalance.hearts_remaining + reactionBalance.smiles_remaining + reactionBalance.thumbs_remaining) / 100) * 100}%`
                        : '75%',
                      backgroundColor: '#6ee7b7',
                    }]} />
                  </View>
                </LinearGradient>

                {/* Reset Timer */}
                <LinearGradient
                  colors={['#451a03', '#92400e', '#b45309']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.balanceFeedCard}
                >
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🔄</Text>
                    <Text style={styles.balanceFeedTitle}>Reset Timer</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Refreshes in</Text>
                  <Text style={styles.balanceFeedValue}>{daysUntilReset} days</Text>
                  <View style={styles.balanceFeedTrack}>
                    <View style={[styles.balanceFeedFill, {
                      width: `${Math.min(100, (daysUntilReset / 31) * 100)}%`,
                      backgroundColor: '#fcd34d',
                    }]} />
                  </View>
                </LinearGradient>

              </View>

              {/* ── Descriptions ────────────────────────────────────── */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceSectionTitle}>Descriptions</Text>
                <View style={styles.balanceInfoCard}>
                  {([
                    {
                      emoji: '⭐',
                      title: `Recognition Badges (${recognitionRemaining ?? '—'} of ${MONTHLY_RECOGNITION_LIMIT})`,
                      body: 'You receive 10 recognition badges per month — to acknowledge great work or behaviour.',
                    },
                    {
                      emoji: '🎓',
                      title: 'Skills Badges (9 of 10)',
                      body: 'You receive 10 skills badges per month — skill-based endorsements you can assign to colleagues for demonstrated competencies.',
                    },
                    {
                      emoji: '😀',
                      title: 'Emoji (75 / 100)',
                      body: 'You receive 100 emoji as a monthly social currency used for quick recognition, reactions, and lightweight appreciation.',
                    },
                    {
                      emoji: '🔄',
                      title: 'Reset Timer',
                      body: 'The number of days remaining until your monthly balance refreshes.',
                    },
                  ] as const).map((item, i, arr) => (
                    <View key={i}>
                      <View style={styles.balanceDescRow}>
                        <Text style={styles.balanceDescEmoji}>{item.emoji}</Text>
                        <View style={styles.balanceDescText}>
                          <Text style={styles.balanceDescTitle}>{item.title}</Text>
                          <Text style={styles.balanceDescBody}>{item.body}</Text>
                        </View>
                      </View>
                      {i < arr.length - 1 && <View style={styles.achieveDivider} />}
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Usage Breakdown ─────────────────────────────────── */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceSectionTitle}>Usage Breakdown</Text>
                <View style={styles.balanceInfoCard}>
                  {([
                    { label: 'Recognition Badges Given', value: '2' },
                    { label: 'Skills Badges Given',      value: '1' },
                    { label: 'Emoji Sent',               value: '25' },
                    { label: 'Total Colleagues Recognized', value: '6' },
                    { label: 'Most Recognized Department',  value: 'Front Office' },
                  ] as const).map((item, i, arr) => (
                    <View key={i}>
                      <View style={styles.balanceUsageRow}>
                        <Text style={styles.balanceUsageLabel}>{item.label}</Text>
                        <Text style={styles.balanceUsageValue}>{item.value}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.achieveDivider} />}
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Activity Visual ─────────────────────────────────── */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceSectionTitle}>Activity Visual</Text>
                <Text style={styles.balanceActivitySub}>Weekly recognition activity</Text>
                <View style={styles.balanceInfoCard}>
                  <View style={styles.balanceBarChart}>
                    {([
                      { day: 'Mon', v: 0.6 },
                      { day: 'Tue', v: 0.4 },
                      { day: 'Wed', v: 0.8 },
                      { day: 'Thu', v: 0.2 },
                      { day: 'Fri', v: 0.6 },
                      { day: 'Sat', v: 0.1 },
                      { day: 'Sun', v: 0.3 },
                    ] as const).map((d) => (
                      <View key={d.day} style={styles.balanceBarCol}>
                        <View style={[styles.balanceBarFill, { height: Math.round(d.v * 60) }]} />
                        <Text style={styles.balanceBarLabel}>{d.day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

            </>
          )}

          {/* ── Utilise tab ─────────────────────────────────────────────── */}
          {activeTab === 'utilise' && (
            <>
              {/* ── 5×2 feed-style cards ──────────────────────────────── */}
              <View style={styles.balanceFeedGrid}>

                {/* Mood Board */}
                <LinearGradient colors={['#4a0000', '#b71c1c', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>❤️</Text>
                    <Text style={styles.balanceFeedTitle}>Mood Board</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Interactions</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Recognition Received */}
                <LinearGradient colors={['#3b0764', '#6d28d9', '#7B1FA2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🏅</Text>
                    <Text style={styles.balanceFeedTitle}>Recognition</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Received</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Skills Shoutout */}
                <LinearGradient colors={['#1e3a5f', '#1d4ed8', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🎓</Text>
                    <Text style={styles.balanceFeedTitle}>Skills Shoutout</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Endorsements received</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Responses */}
                <LinearGradient colors={['#134e4a', '#0d9488', '#14b8a6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>💬</Text>
                    <Text style={styles.balanceFeedTitle}>Responses</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Engagement made</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Status Unlock */}
                <LinearGradient colors={['#451a03', '#92400e', '#b45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>⭐</Text>
                    <Text style={styles.balanceFeedTitle}>Status Unlock</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Tiers achieved</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Badges Achieved */}
                <LinearGradient colors={['#3d2c00', '#92630a', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🏆</Text>
                    <Text style={styles.balanceFeedTitle}>Badges</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Achieved</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Legend of the Month */}
                <LinearGradient colors={['#1a0a2e', '#3b0764', '#6b21a8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>👑</Text>
                    <Text style={styles.balanceFeedTitle}>Legend of</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>the Month</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Emoji's Given */}
                <LinearGradient colors={['#064e3b', '#065f46', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>😊</Text>
                    <Text style={styles.balanceFeedTitle}>Emoji's Given</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Reactions sent</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Birthday Moments */}
                <LinearGradient colors={['#4a0000', '#7f1d1d', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🎂</Text>
                    <Text style={styles.balanceFeedTitle}>Birthday</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Moments</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

                {/* Service Milestones */}
                <LinearGradient colors={['#14532d', '#166534', '#16a34a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceFeedCard}>
                  <View style={styles.balanceFeedHeader}>
                    <Text style={styles.balanceFeedEmoji}>🎖</Text>
                    <Text style={styles.balanceFeedTitle}>Service</Text>
                  </View>
                  <Text style={styles.balanceFeedSub}>Milestones</Text>
                  <Text style={styles.balanceFeedValue}>0</Text>
                </LinearGradient>

              </View>

              {/* ── Descriptions ────────────────────────────────────── */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceSectionTitle}>Descriptions</Text>
                <View style={styles.balanceInfoCard}>
                  {([
                    { emoji: '❤️', title: 'Mood Board Interactions',  body: 'You receive 5 points for showing your mood everyday.' },
                    { emoji: '🏅', title: 'Recognition Received',     body: 'Total number of times colleagues or managers have given recognition to you.' },
                    { emoji: '🎓', title: 'Skills Shoutout',          body: 'Endorsements received for your skills or expertise.' },
                    { emoji: '💬', title: 'Responses Made',           body: 'Your participation in engagement to recognition you have received.' },
                    { emoji: '🎂', title: 'Birthday Moments',         body: 'Celebrations and interactions received on your birthday.' },
                    { emoji: '🎖', title: 'Service Milestones',       body: 'Recognition for tenure (e.g. 1 year, 5 years) within the organisation.' },
                    { emoji: '⭐', title: 'Status Unlock',            body: 'New levels or tiers unlocked through activity and recognition.' },
                    { emoji: '🏆', title: 'Badges Achieved',          body: 'Total badges earned through performance, behaviour, and milestones.' },
                    { emoji: '👑', title: 'Legend of the Month',      body: 'Number of times you\'ve been recognized as a top performer or standout employee.' },
                    { emoji: '😊', title: 'Emoji\'s Given',           body: 'The amount of emoji\'s you received on recognition / skills feed.' },
                  ] as const).map((item, i, arr) => (
                    <View key={i}>
                      <View style={styles.balanceDescRow}>
                        <Text style={styles.balanceDescEmoji}>{item.emoji}</Text>
                        <View style={styles.balanceDescText}>
                          <Text style={styles.balanceDescTitle}>{item.title}</Text>
                          <Text style={styles.balanceDescBody}>{item.body}</Text>
                        </View>
                      </View>
                      {i < arr.length - 1 && <View style={styles.achieveDivider} />}
                    </View>
                  ))}
                </View>
              </View>

            </>
          )}

          {/* ── Achieve tab ─────────────────────────────────────────────── */}
          {activeTab === 'achieve' && (
            <View style={styles.balanceGrid}>

              {/* Badges Earned */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceCardLabel}>Badges Earned</Text>
                {badgesLoading ? (
                  <ActivityIndicator size="small" color={PURPLE} style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.balanceCardValue}>{badgeCount ?? 0}</Text>
                )}
                <Text style={styles.balanceTrendNeutral}>Keep recognising to earn more</Text>
              </View>

              {/* Achievements */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceCardLabel}>Achievements</Text>
                <Text style={styles.balanceCardValue}>—</Text>
                <Text style={styles.balanceTrendNeutral}>Unlocked milestones</Text>
              </View>

              {/* Leaderboard Rank */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceCardLabel}>Leaderboard Rank</Text>
                <Text style={styles.balanceCardValue}>—</Text>
                <Text style={styles.balanceTrendNeutral}>Hotel ranking</Text>
              </View>

              {/* Streak */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceCardLabel}>Streak</Text>
                <Text style={styles.balanceCardValue}>— 🔥</Text>
                <Text style={styles.balanceTrendNeutral}>Consecutive active days</Text>
              </View>

            </View>
          )}

        </ScrollView>

      </View>

      {/* ── Dropdown menu overlay ────────────────────────────────────────── */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Backdrop — tap outside to close */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setMenuOpen(false)}
          />

          {/* Dropdown card */}
          <View style={styles.dropdown}>
            {MENU_ITEMS.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  setMenuOpen(false);
                  router.push(item.route as any);
                }}
                style={[
                  styles.dropdownItem,
                  index < MENU_ITEMS.length - 1 && styles.dropdownItemBorder,
                ]}
              >
                <Ionicons name={item.icon} size={18} color={PURPLE} />
                <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </Pressable>
            ))}

            {/* Divider before sign out */}
            <View style={styles.dropdownDivider} />

            <Pressable
              onPress={async () => {
                setMenuOpen(false);
                await clearEmployee();
                router.replace('/(auth)/employee-auth');
              }}
              style={styles.dropdownItem}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[styles.dropdownItemLabel, styles.signOutLabel]}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
  },

  headerOverlay: {
    backgroundColor: 'rgba(20,0,40,0.45)',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 20,
  },

  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  navIcon: {
    padding: 4,
  },

  // ── Profile row ─────────────────────────────────────────────────────────────
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
    marginBottom: 4,
  },

  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── Avatar — splash style (matches leaderboard podium) ─────────────────────
  avatarWrapper: {
    width: 146,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
  },

  splashBase: {
    position: 'absolute',
    width: 130,
    height: 148,
    backgroundColor: PURPLE,
    borderTopLeftRadius: 72,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 72,
    borderBottomLeftRadius: 20,
    opacity: 0.95,
    transform: [{ rotate: '22deg' }],
  },

  splashAccent: {
    position: 'absolute',
    width: 114,
    height: 130,
    top: 0,
    right: 2,
    backgroundColor: ACCENT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 60,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 60,
    opacity: 0.65,
    transform: [{ rotate: '-14deg' }],
  },

  photoContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    zIndex: 3,
  },

  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },

  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  avatarSpinner: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  // ── Name & subtitle ──────────────────────────────────────────────────────────
  name: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 1,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '400',
  },

  // ── Stats card (white) — in normal flow below tabs ──────────────────────────
  statsCard: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#D1C4E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    gap: 10,
  },

  // ── Pills row ─────────────────────────────────────────────────────────────────
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },

  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  pillTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e1b4b',
  },

  pillHeader: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    minHeight: 24,
    lineHeight: 12,
  },



  // ── Stats row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  statsPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  reactionMerged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  reactionPts: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    flexShrink: 1,
  },

  reactionPtsDark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e1b4b',
    flexShrink: 1,
  },

  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },

  statInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statDivider: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  statIcon: {
    fontSize: 18,
  },

  statPts: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },

  moodContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },

  // ── Tab selector — overlaps the header's rounded bottom edge ────────────────
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: -22,
    zIndex: 10,
  },

  tabPill: {
    flexDirection: 'row',
    backgroundColor: '#8E24AA',
    borderRadius: 20,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },

  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  tabTextActive: {
    color: PURPLE,
  },

  // ── Content area ─────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Skills card
  skillsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  skillsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
  },

  skillsCardSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Achievements card
  achieveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  achieveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },

  achieveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  achieveInfo: {
    flex: 1,
  },

  achieveLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },

  achieveSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },

  achieveValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PURPLE,
  },

  achieveDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },

  progressBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginBottom: 14,
    marginTop: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Dropdown ─────────────────────────────────────────────────────────────────
  dropdown: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 56 : 52,
    left: 16,
    width: 230,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  dropdownItemLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },

  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },

  signOutLabel: {
    color: '#ef4444',
  },

  contentScroll: {
    flex: 1,
  },

  // ── Balance feed-style 2×2 grid ──────────────────────────────────────────────
  balanceFeedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 2,
  },

  balanceFeedCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 12,
    minHeight: 118,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  balanceFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },

  balanceFeedEmoji: {
    fontSize: 16,
  },

  balanceFeedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },

  balanceFeedSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 4,
  },

  balanceFeedValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
  },

  balanceFeedTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },

  balanceFeedFill: {
    height: 4,
    borderRadius: 2,
  },

  // ── Balance info sections ─────────────────────────────────────────────────────
  balanceSection: {
    marginTop: 16,
  },

  balanceSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  balanceInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  balanceDescRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 10,
  },

  balanceDescEmoji: {
    fontSize: 20,
    paddingTop: 1,
  },

  balanceDescText: {
    flex: 1,
  },

  balanceDescTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },

  balanceDescBody: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },

  balanceUsageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },

  balanceUsageLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },

  balanceUsageValue: {
    fontSize: 14,
    fontWeight: '800',
    color: PURPLE,
  },

  balanceActivitySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: -4,
  },

  balanceBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    height: 100,
  },

  balanceBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },

  balanceBarFill: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: 4,
    opacity: 0.85,
  },

  balanceBarLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  emojiValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  emojiCountItem: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },

  // ── Balance grid ──────────────────────────────────────────────────────────────
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  balanceCard: {
    width: '47.5%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  balanceCardHighlight: {
    borderColor: '#D1C4E9',
    backgroundColor: '#f5f3ff',
  },

  balanceCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  balanceCardValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },

  balanceTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  balanceTrendUp: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },

  balanceTrendDown: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },

  balanceTrendNeutral: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
