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
import { MoodPromptCard } from '@/components/mood/MoodPromptCard';

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
  { label: "FAQ's", icon: 'help-circle-outline' as const, route: '/(screens)/faq' },
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

  const { data: reactionBalance, isLoading: reactionLoading } = useReactionBalance();

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
    { icon: '❤️', value: reactionBalance?.hearts_remaining ?? REACTION_TOTALS.heart,    pts: 20 },
    { icon: '😊', value: reactionBalance?.smiles_remaining ?? REACTION_TOTALS.smile,    pts: 15 },
    { icon: '👍', value: reactionBalance?.thumbs_remaining ?? REACTION_TOTALS.thumbs_up, pts: 10 },
  ];

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

    const uri  = result.assets[0].uri;
    const path = `${employee.employee_id}/avatar`;

    // Show local image immediately
    setPhotoUrl(uri);
    setUploading(true);

    try {
      const { publicUrl } = await uploadImage(uri, 'avatars', path);

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'update_employee_avatar' as any,
        { p_photo_url: publicUrl },
      );
      if (rpcError) throw new Error(rpcError.message);

      const rpcResult = rpcData as { ok: boolean; error?: string } | null;
      if (rpcResult?.ok === false) {
        throw new Error(rpcResult?.error ?? 'Could not save photo.');
      }

      // Swap to the persisted remote URL
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message ?? 'Something went wrong.');
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

        {/* ── Purple header card ──────────────────────────────────────────── */}
        <View style={styles.header}>

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

          {/* Avatar — tappable */}
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                onError={() => setPhotoUrl(null)}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {/* Spinner overlaid on top — never hides the photo */}
            {uploading && (
              <View style={styles.avatarSpinner}>
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </Pressable>

          {/* Name */}
          <Text style={styles.name}>{employee.full_name}</Text>

          {/* Job title */}
          {jobTitle ? (
            <Text style={styles.subtitle}>{jobTitle}</Text>
          ) : null}

          {/* Hotel & Department */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{employee.hotel}</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.metaText}>{employee.department ?? '—'}</Text>
          </View>

          {/* Points + Status pills */}
          {(() => {
            const MOCK_WEEKLY = 7; // mock: 7 recognitions this week → Bronze
            const status = getStatus(MOCK_WEEKLY);
            return (
              <View style={styles.pillsRow}>

                {/* Points pill */}
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>Recognition Points</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    {pointsBalance === null ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <Text style={styles.pillText}>{pointsBalance} pts</Text>
                    )}
                  </View>
                </View>

                {/* Streak pill */}
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>Reward Wallet</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={16} color="#34d399" />
                    {pointsBalance === null ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <Text style={styles.pillText}>{pointsBalance} pts</Text>
                    )}
                  </View>
                </View>

                {/* Status pill */}
                <View style={[styles.pill, { flexDirection: 'column', alignItems: 'center', gap: 4 }]}>
                  <Text style={styles.pillHeader}>Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={status.icon} size={16} color={status.color} />
                    <Text style={[styles.pillText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

              </View>
            );
          })()}

          {/* Stats row */}
          <View style={styles.statsRow}>
            {reactionLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              stats.map((stat, i) => (
                <View key={i} style={styles.statCol}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statInner}>
                    <Text style={styles.statIcon}>{stat.icon}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                  <Text style={styles.statPts}>({stat.pts} pts each)</Text>
                </View>
              ))
            )}
          </View>

        </View>

        {/* ── Mood prompt ─────────────────────────────────────────────────── */}
        <View style={styles.moodContainer}>
          <MoodPromptCard />
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
                    {tab === 'gamification' ? 'Achievements' : 'Announcements'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

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
                <Text style={styles.achieveValue}>3</Text>
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
              {(() => {
                const MOCK_WEEKLY = 7;
                const status = getStatus(MOCK_WEEKLY);
                const nextTier = STATUS_TIERS.find((t) => t.min > MOCK_WEEKLY);
                const progress = nextTier
                  ? Math.min(MOCK_WEEKLY / nextTier.min, 1)
                  : 1;
                return (
                  <View>
                    <View style={styles.achieveRow}>
                      <View style={[styles.achieveIconWrap, { backgroundColor: status.color + '22' }]}>
                        <Ionicons name={status.icon} size={20} color={status.color} />
                      </View>
                      <View style={styles.achieveInfo}>
                        <Text style={styles.achieveLabel}>Status — {status.label}</Text>
                        <Text style={styles.achieveSub}>
                          {nextTier
                            ? `${MOCK_WEEKLY}/${nextTier.min} recognitions to ${nextTier.label}`
                            : 'You have reached the top tier!'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: status.color }]} />
                    </View>
                  </View>
                );
              })()}

              <View style={styles.achieveDivider} />

              {/* ── Milestones ──────────────────────────────────────────── */}
              <View style={styles.achieveRow}>
                <View style={[styles.achieveIconWrap, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="flag-outline" size={20} color="#16a34a" />
                </View>
                <View style={styles.achieveInfo}>
                  <Text style={styles.achieveLabel}>Milestones</Text>
                  <Text style={styles.achieveSub}>Next: 10 recognitions sent</Text>
                </View>
                <Text style={styles.achieveValue}>2 / 5</Text>
              </View>

            </View>
          )}

          {activeTab === 'announcements' && (
            <View style={styles.skillsCard}>
              <Ionicons name="megaphone-outline" size={32} color={PURPLE_MID} />
              <Text style={styles.skillsCardTitle}>Announcements</Text>
              <Text style={styles.skillsCardSub}>Company announcements will appear here</Text>
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
    backgroundColor: PURPLE,
  },

  screen: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
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

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: ACCENT,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },

  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#ffffff',
  },

  avatarInitials: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  avatarSpinner: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Name & subtitle ──────────────────────────────────────────────────────────
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 1,
  },

  subtitle: {
    fontSize: 14,
    color: LIGHT_TEXT,
    textAlign: 'center',
    marginBottom: 2,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 12,
    color: LIGHT_TEXT,
    fontWeight: '500',
  },

  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // ── Pills row ─────────────────────────────────────────────────────────────────
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 4,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 7,
  },

  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  pillHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },



  // ── Stats row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
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
    fontSize: 23,
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
    paddingTop: 16,
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
    marginBottom: 12,
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
