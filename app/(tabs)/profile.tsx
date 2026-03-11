import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/utils/image';
import { useReactionBalance, REACTION_TOTALS } from '@/hooks/use-reaction-balance';

// ─── Brand colours ────────────────────────────────────────────────────────────

const PURPLE     = '#7B1FA2';
const PURPLE_MID = '#9C27B0';
const ACCENT     = '#CE21FB';
const LIGHT_TEXT = '#EDE7F6';

// ─── Dropdown menu items ──────────────────────────────────────────────────────

const MENU_ITEMS = [
  { label: 'Pending Orders',   icon: 'receipt-outline'  as const, route: '/(screens)/orders' },
  { label: 'Redeemed Rewards', icon: 'gift-outline'     as const, route: '/(screens)/wallet' },
  { label: 'Mood History',     icon: 'heart-outline'    as const, route: '/(screens)/mood'   },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { employee, clearEmployee } = useEmployee();

  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [jobTitle,      setJobTitle]      = useState<string | null>(null);
  const [photoUrl,      setPhotoUrl]      = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<'gamification' | 'skills'>('gamification');
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
    try {
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

      setUploading(true);

      const uri               = result.assets[0].uri;
      const path              = `${employee.employee_id}/avatar`;
      const { publicUrl }     = await uploadImage(uri, 'avatars', path);

      const { data: rpcData } = await (supabase.rpc as any)(
        'update_employee_avatar',
        { p_photo_url: publicUrl },
      );
      const rpcResult = rpcData as { ok: boolean; error?: string } | null;

      if (rpcResult?.ok === false) {
        Alert.alert('Upload Error', rpcResult?.error ?? 'Could not save photo.');
        return;
      }

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

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
            {uploading ? (
              <View style={styles.avatar}>
                <ActivityIndicator color="#ffffff" size="large" />
              </View>
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </Pressable>

          {/* Name */}
          <Text style={styles.name}>{employee.full_name}</Text>

          {/* Job title */}
          <Text style={styles.subtitle}>
            {jobTitle ?? employee.hotel}
          </Text>

          {/* Points balance pill */}
          <View style={styles.pointsPill}>
            <Ionicons name="trophy" size={22} color={ACCENT} />
            {pointsBalance === null ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 6 }} />
            ) : (
              <Text style={styles.pointsPillText}>{pointsBalance} pts</Text>
            )}
          </View>

          {/* Recognition hint */}
          <Text style={styles.recognitionHint}>
            Your recognition left to use. Resets every month.
          </Text>

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

        {/* ── Pill tab selector ───────────────────────────────────────────── */}
        <View style={styles.tabContainer}>
          <View style={styles.tabPill}>
            {(['gamification', 'skills'] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab === 'gamification' ? 'Gamification' : 'Skills'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Content area ────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {activeTab === 'gamification' && (
            <View style={styles.skillsCard}>
              <Ionicons name="game-controller-outline" size={32} color={PURPLE_MID} />
              <Text style={styles.skillsCardTitle}>Gamification</Text>
              <Text style={styles.skillsCardSub}>New games will launch soon</Text>
            </View>
          )}

          {activeTab === 'skills' && (
            <Pressable
              onPress={() => router.push('/(screens)/skills')}
              style={styles.skillsCard}
            >
              <Ionicons name="bar-chart-outline" size={32} color={PURPLE_MID} />
              <Text style={styles.skillsCardTitle}>View Skills</Text>
              <Text style={styles.skillsCardSub}>See your skill scores and ratings</Text>
            </Pressable>
          )}

        </View>

      </ScrollView>

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
              onPress={() => {
                setMenuOpen(false);
                clearEmployee();
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

  scrollView: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },

  scrollContent: {
    paddingBottom: 100,
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
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: LIGHT_TEXT,
    textAlign: 'center',
    marginBottom: 8,
  },

  // ── Points pill ──────────────────────────────────────────────────────────────
  pointsPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },

  pointsPillText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  recognitionHint: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 10,
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

  // ── Tab selector ─────────────────────────────────────────────────────────────
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
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
