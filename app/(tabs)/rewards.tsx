import React, { useRef, useState } from 'react';
import {
  Animated, View, Text, ScrollView, StyleSheet,
  Modal, TouchableWithoutFeedback, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

const PURPLE = '#7B1FA2';
const MOCK_POINTS = 350;

const REWARDS = [
  { id: 0, title: 'KFC Voucher',         pts: 200,  stock: 8,  image: require('../../assets/KFC.png'),      terms: 'Valid at participating KFC outlets. Not redeemable for cash. One voucher per visit. Cannot be combined with other offers. Expires 90 days after redemption.' },
  { id: 1, title: 'Steers Voucher',      pts: 500,  stock: 3,  image: require('../../assets/Steers.png'),   terms: 'Valid at participating Steers outlets. Not redeemable for cash. One voucher per visit. Cannot be combined with other offers. Expires 90 days after redemption.' },
  { id: 2, title: 'Checkers Voucher',    pts: 150,  stock: 10, image: require('../../assets/Checkers.png'), terms: 'Valid at all Checkers and Checkers Hyper stores. Not redeemable for cash. Single use only. Expires 90 days after redemption.' },
  { id: 3, title: 'Pick n Pay Voucher',  pts: 800,  stock: 0,  image: require('../../assets/PicknPay.png'), terms: 'Valid at all Pick n Pay stores. Not redeemable for cash. Single use only. Cannot be used on tobacco or alcohol. Expires 90 days after redemption.' },
  { id: 4, title: 'Vodacom\nData Bundle', pts: 300,  stock: 2,  image: require('../../assets/Vodacom.png'),  terms: 'Valid for Vodacom prepaid and contract customers. Data valid for 30 days once applied. Bundle cannot be transferred. Subject to Vodacom network availability.' },
  { id: 5, title: 'MTN Airtime',         pts: 1200, stock: 1,  image: require('../../assets/MTN.png'),      terms: 'Valid for MTN prepaid customers only. Airtime credited within 24 hours. Cannot be transferred or exchanged for cash. Subject to MTN network terms.' },
];

const HOTEL_REWARDS = [
  { id: 10, title: 'Breakfast for 2',          pts: 300, stock: 6,  photo: true, image: require('../../assets/breakfast.jpg'),    terms: 'Valid for a full breakfast for two at the hotel restaurant. Subject to availability. Must be booked 24 hours in advance. Non-transferable. Expires 90 days after issue.' },
  { id: 11, title: "Chiefs Boma Dinner",        pts: 500, stock: 4,  photo: true, image: require('../../assets/ChiefsBoma.jpg'),   terms: 'Valid for a dinner experience at the Chiefs Boma. Subject to availability. Must be booked in advance. Non-transferable. Cannot be exchanged for cash. Expires 90 days after issue.' },
  { id: 12, title: 'Courtyard Experience',      pts: 200, stock: 8,  photo: true, image: require('../../assets/courtyard.jpg'),   terms: 'Valid for a courtyard dining experience at the hotel. Subject to availability. Single use only. Non-transferable. Cannot be exchanged for cash. Expires 90 days after issue.' },
  { id: 13, title: 'Wine Tasting Experience',   pts: 400, stock: 3,  photo: true, image: require('../../assets/tasting-room.jpg'), terms: 'Valid for a guided wine tasting session at the hotel tasting room. Subject to availability. Must be booked in advance. Non-transferable. Expires 90 days after issue.' },
];

type Reward = (typeof REWARDS[0]) | (typeof HOTEL_REWARDS[0]);

// ── Flip card ────────────────────────────────────────────────────────────────
function RewardCard({ item }: { item: Reward }) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const canAfford  = MOCK_POINTS >= item.pts;
  const outOfStock = item.stock <= 0;

  const handleFlip = () => {
    const toValue = flipped ? 0 : 1;
    Animated.spring(flipAnim, { toValue, friction: 7, tension: 40, useNativeDriver: true }).start();
    setFlipped(v => !v);
  };

  const handleRedeem = () => setConfirming(true);

  const frontRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '180deg'] });
  const backRotate   = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] });

  return (
    <View style={[s.cardContainer, outOfStock && s.cardDisabled]}>

      {/* ── FRONT — purely visual, no touch handling ── */}
      <Animated.View
        pointerEvents="none"
        style={[s.cardFace, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity }]}
      >
        {'photo' in item && item.photo ? (
          <>
            <Image source={item.image} style={s.photoImg} resizeMode="cover" />
            <View style={s.divider} />
            <View style={s.cardBottom}>
              <View style={s.cardTitleRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={s.pill}>
                  <Ionicons name="cash-outline" size={9} color="#16a34a" />
                  <Text style={[s.pillTxt, { color: '#16a34a' }]}> {item.pts}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.logoWrap}>
              <Image source={item.image} style={s.brandLogo} resizeMode="contain" />
            </View>
            <View style={s.divider} />
            <View style={s.cardBottom}>
              {item.title.includes('\n') ? (
                <>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.cardPillRow}>
                    <View style={s.pill}>
                      <Ionicons name="cash-outline" size={9} color="#16a34a" />
                      <Text style={[s.pillTxt, { color: '#16a34a' }]}> {item.pts}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={s.cardTitleRow}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={s.pill}>
                    <Ionicons name="cash-outline" size={9} color="#16a34a" />
                    <Text style={[s.pillTxt, { color: '#16a34a' }]}> {item.pts}</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* ── BACK — purely visual, no touch handling ── */}
      <Animated.View
        pointerEvents="none"
        style={[s.cardFace, s.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity }]}
      >
        <View style={s.backHeader}>
          <Text style={[s.backHeading, { flex: 1 }]} numberOfLines={1}>{item.title}</Text>
          {'photo' in item && item.photo && (
            <Image
              source={require('../../assets/Indaba Hotel.png')}
              style={s.hotelLogoBack}
              resizeMode="contain"
            />
          )}
        </View>
        <View style={s.divider} />
        <View style={s.backBody}>
          <Text style={s.backTerms}>{item.terms}</Text>
        </View>
        {!outOfStock && (
          canAfford
            ? <Text style={s.canAfford}>✓ Can redeem</Text>
            : <Text style={s.deficit}><Text style={s.deficitCross}>✗ </Text>Need {item.pts - MOCK_POINTS} more pts</Text>
        )}
      </Animated.View>

      {/* ── TOUCH LAYER — flat siblings, no nesting ── */}

      {/* Flip zone — lower elevation so redeem button wins */}
      <TouchableOpacity
        style={[StyleSheet.absoluteFillObject, { elevation: 1 }]}
        activeOpacity={1}
        onPress={handleFlip}
        disabled={outOfStock}
      />

      {/* Redeem tick — higher elevation so it always wins the touch race on Android */}
      {!outOfStock && !flipped && (
        <TouchableOpacity
          style={[s.redeemBtn, !canAfford && s.redeemBtnDim, { elevation: 10 }]}
          onPress={handleRedeem}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="checkmark" size={13} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Confirmation modal */}
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <View style={s.confirmIconRow}>
              <View style={[s.confirmIconWrap, 'photo' in item && item.photo && s.confirmIconWrapPhoto]}>
                <Image
                  source={item.image}
                  style={s.confirmLogo}
                  resizeMode={'photo' in item && item.photo ? 'cover' : 'contain'}
                />
              </View>
            </View>
            <Text style={s.confirmTitle}>Redeem Reward</Text>
            <Text style={s.confirmMsg}>
              You are about to redeem{'\n'}
              <Text style={s.confirmBrand}>"{item.title}"</Text>
              {'\n'}for{'  '}
            </Text>
            <View style={s.confirmPtsRow}>
              <Ionicons name="cash-outline" size={16} color="#16a34a" />
              <Text style={s.confirmPts}>{item.pts} pts</Text>
            </View>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.btnBack} onPress={() => setConfirming(false)} activeOpacity={0.8}>
                <Text style={s.btnBackTxt}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btnConfirm}
                activeOpacity={0.8}
                onPress={() => {
                  setConfirming(false);
                  router.push(`/(screens)/reward/${item.id}` as any);
                }}
              >
                <Text style={s.btnConfirmTxt}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RewardsScreen() {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<'retail' | 'hotel'>('retail');

  const currentRewards = activeTab === 'retail' ? REWARDS : HOTEL_REWARDS;
  const rows: typeof REWARDS[] = [];
  for (let i = 0; i < currentRewards.length; i += 2) {
    rows.push(currentRewards.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>

        {/* Top row: menu + balance */}
        <View style={s.headerTopRow}>
          <View>
            <Pressable style={s.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
              <Ionicons name="menu" size={24} color="#fff" />
            </Pressable>

            <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
              <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
                <View style={s.modalBackdrop}>
                  <TouchableWithoutFeedback>
                    <View style={s.dropdown}>
                      <Pressable style={s.dropdownItem} onPress={() => { setMenuOpen(false); router.push('/(screens)/orders' as any); }}>
                        <Ionicons name="time-outline" size={16} color={PURPLE} />
                        <Text style={s.dropdownText}>Pending Orders</Text>
                      </Pressable>
                      <View style={s.dropdownDivider} />
                      <Pressable style={s.dropdownItem} onPress={() => { setMenuOpen(false); router.push('/(screens)/redeemed' as any); }}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={PURPLE} />
                        <Text style={s.dropdownText}>Redeem History</Text>
                      </Pressable>
                      <View style={s.dropdownDivider} />
                      <Pressable style={s.dropdownItem} onPress={() => setMenuOpen(false)}>
                        <Ionicons name="information-circle-outline" size={16} color={PURPLE} />
                        <Text style={s.dropdownText}>How it Works</Text>
                      </Pressable>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>

          <View style={s.balanceRow}>
            <View style={s.starBox}>
              <Ionicons name="cash-outline" size={20} color="#34d399" />
            </View>
            <Text style={[s.balanceValue, { marginLeft: 10 }]}>{MOCK_POINTS}</Text>
          </View>
        </View>

        {/* ── Pill tab selector ── */}
        <View style={s.tabPill}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'retail' && s.tabBtnActive]}
            onPress={() => setActiveTab('retail')}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, activeTab === 'retail' && s.tabTxtActive]}>RETAIL AWARDS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'hotel' && s.tabBtnActive]}
            onPress={() => setActiveTab('hotel')}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, activeTab === 'hotel' && s.tabTxtActive]}>HOTEL REWARDS</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* ── Grid ── */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.sheet}>
          <View style={s.handle} />
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((item) => <RewardCard key={item.id} item={item} />)}
            </View>
          ))}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#f5f3ff' },
  scroll:  { flex: 1, backgroundColor: '#f5f3ff' },
  content: { paddingBottom: 110, flexGrow: 1 },

  // Header
  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  headerTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn:       { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  balanceRow:    { flexDirection: 'row', alignItems: 'center' },
  starBox:       { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  balanceValue:  { fontSize: 26, fontWeight: 'bold', color: '#fff' },

  // Pill tabs
  tabPill:       { flexDirection: 'row', backgroundColor: '#8E24AA', borderRadius: 20, padding: 4 },
  tabBtn:        { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 16 },
  tabBtnActive:  { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  tabTxt:        { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  tabTxtActive:  { color: PURPLE },

  // Dropdown
  modalBackdrop:   { flex: 1 },
  dropdown:        { position: 'absolute', top: 100, left: 16, backgroundColor: '#fff', borderRadius: 14, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  dropdownItem:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  dropdownText:    { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e1b4b' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 },

  // Sheet
  sheet:  { backgroundColor: '#f5f3ff', paddingTop: 14, paddingHorizontal: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd6fe', alignSelf: 'center', marginBottom: 14 },

  // Grid
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },

  // Card container
  cardContainer: {
    flex: 1,
    aspectRatio: 0.92,
    marginHorizontal: 4,
  },
  cardDisabled: {
    opacity: 0.38,
  },

  // Shared face — absolute, fills container
  cardFace: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderColor: '#000',
    overflow: 'hidden',
  },
  cardBack: { backgroundColor: '#faf5ff' },

  // Front
  logoWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  brandLogo: { width: '100%', height: '100%' },
  photoImg:  { flex: 1, width: '100%' },
  hotelLogoBack: {
    width: 52,
    height: 22,
    marginRight: 4,
  },
  divider:   { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 8 },
  cardBottom:    { paddingLeft: 8, paddingRight: 38, paddingTop: 4, paddingBottom: 8 },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 3 },
  cardPillRow:   { flexDirection: 'row', justifyContent: 'flex-end' },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardTitle:     { fontSize: 11, fontWeight: '700', color: '#1e1b4b', lineHeight: 15, flex: 1 },
  canAfford: { fontSize: 9, fontWeight: '700', color: '#16a34a', textAlign: 'center', paddingBottom: 4 },
  deficit:      { fontSize: 9, color: '#ef4444', textAlign: 'center', paddingBottom: 4 },
  deficitCross: { color: '#ef4444', fontWeight: '700' },
  flipHint:  { fontSize: 8, color: '#a78bfa', textAlign: 'center', paddingBottom: 5 },

  // Pills
  pill:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 2 },
  pillTxt:   { fontSize: 10, fontWeight: '700' },
  pillTxtW:  { fontSize: 8,  fontWeight: '700', color: '#fff', letterSpacing: 0.4 },

  // Redeem button — absolute sibling in cardContainer touch layer
  redeemBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemBtnDim: { backgroundColor: '#c4b5fd' },

  // Confirmation modal
  confirmOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  confirmBox:      { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '78%', alignItems: 'center' },
  confirmIconRow:  { marginBottom: 12, alignItems: 'center' },
  confirmIconWrap: { width: 90, height: 72, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 8 },
  confirmIconWrapPhoto: { padding: 0 },
  confirmLogo:    { width: '100%', height: '100%' },
  confirmPtsRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  confirmTitle:    { fontSize: 17, fontWeight: '700', color: '#1e1b4b', marginBottom: 10 },
  confirmMsg:      { fontSize: 13, color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  confirmBrand:    { fontWeight: '700', color: '#1e1b4b' },
  confirmPts:      { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  confirmBtns:     { flexDirection: 'row', gap: 10, width: '100%' },
  btnBack:         { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  btnBackTxt:      { fontSize: 14, fontWeight: '600', color: '#64748b' },
  btnConfirm:      { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center' },
  btnConfirmTxt:   { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Back face
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, paddingBottom: 7 },
  backHeading:{ fontSize: 10, fontWeight: '700', color: '#1e1b4b' },
  backBody:   { flex: 1, padding: 10 },
  backTitle:  { fontSize: 11, fontWeight: '700', color: '#1e1b4b', marginBottom: 5 },
  backTerms:  { fontSize: 9, color: '#374151', lineHeight: 14 },
});
