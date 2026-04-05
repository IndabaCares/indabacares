import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/utils/image';
import { useReactionBalance, REACTION_TOTALS } from '@/hooks/use-reaction-balance';
import { useRecognitionBalance, MONTHLY_RECOGNITION_LIMIT } from '@/hooks/use-recognition-balance';
import { useUserBadges } from '@/hooks/use-user-badges';

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
  { label: 'Indaba Cares',    icon: 'ribbon-outline'  as const, route: '/(screens)/initiatives' },
  { label: 'Know your team',  icon: 'people-outline'  as const, route: '/(screens)/team'        },
  { label: "FAQ's",           icon: 'help-circle-outline' as const, route: '/(screens)/faq'     },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { employee, clearEmployee } = useEmployee();

  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [jobTitle,      setJobTitle]      = useState<string | null>(null);
  const [photoUrl,      setPhotoUrl]      = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<'gamification' | 'announcements'>('gamification');
  const [menuOpen,      setMenuOpen]      = useState(false);

  const { data: reactionBalance,     isLoading: reactionLoading }       = useReactionBalance();
  const { data: recognitionRemaining, isLoading: recognitionLoading }   = useRecognitionBalance();
  const { data: badgeCount,           isLoading: badgesLoading }        = useUserBadges();

  // Number of recognitions given this month (used for status tier calculation).
  // Only computed once recognitionRemaining has resolved to avoid "Unranked" flash.
  const recognitionsGiven = recognitionLoading
    ? null
    : MONTHLY_RECOGNITION_LIMIT - (recognitionRemaining ?? MONTHLY_RECOGNITION_LIMIT);

  // ── Fetch employee profile data ────────────────────────────────────────────
  useEffect(() => {
    if (!employee) return;
    supabase
      .from('employees')
      .select('points_balance, job_title, photo_url')
      .eq('id', employee.employee_id)
      .single()
      .then(({ data }) => {
        if (data) {
          const row = data as { points_balance: number; job_title: string | null; photo_url: string | null };
          setPointsBalance(row.points_balance);
          setJobTitle(row.job_title ?? null);
          setPhotoUrl(row.photo_url ?? null);
        }
      });
  }, [employee?.employee_id]);

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
          source={require('../../assets/Indaba-long.jpg')}
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
                <View style={styles.metaDivider} />
                <Text style={styles.metaText}>{employee.department ?? '—'}</Text>
              </View>
            </View>

          </View>

          </View>{/* end headerOverlay */}

        </ImageBackground>

        {/* ── Stats / pills card — 50% overhanging the image border radius ── */}
        <View style={styles.statsCard}>

          {/* Points + Status pills */}
          {(() => {
            const status = recognitionsGiven !== null ? getStatus(recognitionsGiven) : null;
            return (
              <View style={styles.pillsRow}>
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>Recognition Rewards</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    {pointsBalance === null ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <Text style={styles.pillTextDark}>{pointsBalance} pts</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>Reward Wallet</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={16} color="#34d399" />
                    {pointsBalance === null ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <Text style={styles.pillTextDark}>{pointsBalance} pts</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>{'Status\nLevel'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {status === null ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <>
                        <Ionicons name={status.icon} size={16} color={status.color} />
                        <Text style={[styles.pillTextDark, { color: status.color }]}>{status.label}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Reaction + Recognition stats */}
          <View style={styles.statsRow}>
            <View style={styles.statsPill}>
              <View style={styles.reactionMerged}>
                {stats.map((stat, i) => (
                  <Text key={i} style={styles.statIcon}>{stat.icon}</Text>
                ))}
                <Text style={styles.reactionPtsDark}>= {remainingReactionPts} pts</Text>
              </View>
            </View>
            <View style={styles.statsPill}>
              <View style={styles.reactionMerged}>
                <Text style={styles.statIcon}>⭐</Text>
                <Text style={styles.reactionPtsDark}>Recognition Badges = {recognitionRemaining ?? MONTHLY_RECOGNITION_LIMIT}</Text>
              </View>
            </View>
          </View>

        </View>

        {/* ── Pill tab selector ───────────────────────────────────────────── */}
        <View style={styles.tabContainer}>
          <View style={styles.tabPill}>
            {(['gamification', 'announcements'] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab === 'gamification' ? 'Achievements' : 'Milestones'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <View style={[styles.content, { paddingBottom: 100 }]}>

          {activeTab === 'gamification' && (
            <View style={styles.achieveCard}>

              {/* ── Badges ──────────────────────────────────────────────── */}
              <View style={styles.achieveRow}>
                <View style={[styles.achieveIconWrap, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="ribbon-outline" size={20} color="#d97706" />
                </View>
                <View style={styles.achieveInfo}>
                  <Text style={styles.achieveLabel}>Badges Earned</Text>
                  <Text style={styles.achieveSub}>Keep recognising to unlock more</Text>
                </View>
                {badgesLoading ? (
                  <ActivityIndicator size="small" color={PURPLE} />
                ) : (
                  <Text style={styles.achieveValue}>{badgeCount ?? 0}</Text>
                )}
              </View>

              <View style={styles.achieveDivider} />

              {/* ── Recognitions Received ───────────────────────────────── */}
              <View style={styles.achieveRow}>
                <View style={[styles.achieveIconWrap, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="star-outline" size={20} color={PURPLE} />
                </View>
                <View style={styles.achieveInfo}>
                  <Text style={styles.achieveLabel}>Recognitions Received</Text>
                  <Text style={styles.achieveSub}>Total shout-outs from your team</Text>
                </View>
                <Text style={styles.achieveValue}>{pointsBalance !== null ? Math.floor((pointsBalance ?? 0) / 10) : '—'}</Text>
              </View>

              <View style={styles.achieveDivider} />

              {/* ── Status & Progress ───────────────────────────────────── */}
              {recognitionsGiven === null ? (
                <View style={[styles.achieveRow, { justifyContent: 'center' }]}>
                  <ActivityIndicator size="small" color={PURPLE} />
                </View>
              ) : (() => {
                const status   = getStatus(recognitionsGiven);
                const nextTier = [...STATUS_TIERS].reverse().find((t) => t.min > recognitionsGiven);
                return (
                  <View style={styles.achieveRow}>
                    <View style={[styles.achieveIconWrap, { backgroundColor: status.color + '22' }]}>
                      <Ionicons name={status.icon} size={20} color={status.color} />
                    </View>
                    <View style={styles.achieveInfo}>
                      <Text style={styles.achieveLabel}>Status</Text>
                      <Text style={styles.achieveSub}>
                        {nextTier
                          ? `${nextTier.min - recognitionsGiven} more recognitions to reach ${nextTier.label}`
                          : 'You have reached the top tier!'}
                      </Text>
                    </View>
                    <Text style={[styles.achieveValue, { color: status.color }]}>{status.label}</Text>
                  </View>
                );
              })()}


            </View>
          )}

          {activeTab === 'announcements' && (
            <View style={styles.skillsCard}>
              <Ionicons name="flag-outline" size={32} color={PURPLE_MID} />
              <Text style={styles.skillsCardTitle}>Milestones</Text>
              <Text style={styles.skillsCardSub}>Your milestones will appear here</Text>
            </View>
          )}

        </View>

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
    paddingBottom: 72,
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

  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // ── Stats card (white) — sits 50% below image border radius ─────────────────
  statsCard: {
    marginHorizontal: 20,
    marginTop: -56,
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

  // ── Tab selector ─────────────────────────────────────────────────────────────
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
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
});
