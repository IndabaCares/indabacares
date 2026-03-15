import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

const PURPLE = '#7B1FA2';
const MOCK_POINTS = 350;

const CARD_COLORS = ['#7B1FA2', '#5B21B6', '#1D4ED8', '#0F766E', '#B45309', '#BE185D'];

const REWARDS = [
  { id: 0, title: 'Spa Day Voucher',        pts: 200,  stock: 8  },
  { id: 1, title: 'Staff Lunch Buffet',     pts: 500,  stock: 3  },
  { id: 2, title: 'Early Finish Friday',    pts: 150,  stock: 10 },
  { id: 3, title: 'Premium Parking Pass',   pts: 800,  stock: 0  },
  { id: 4, title: 'Hotel Gift Shop Credit', pts: 300,  stock: 2  },
  { id: 5, title: 'Weekend Staycation',     pts: 1200, stock: 1  },
];

export default function RewardsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  // chunk into rows of 2
  const rows = [];
  for (let i = 0; i < REWARDS.length; i += 2) {
    rows.push(REWARDS.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Fixed purple header ────────────────────────────── */}
      <View style={s.header}>

        {/* Hamburger (left) */}
        <View>
          <Pressable style={s.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>

          <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
            <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
              <View style={s.modalBackdrop}>
                <TouchableWithoutFeedback>
                  <View style={s.dropdown}>
                    <Pressable
                      style={s.dropdownItem}
                      onPress={() => { setMenuOpen(false); router.push('/(screens)/orders' as any); }}
                    >
                      <Ionicons name="time-outline" size={16} color={PURPLE} />
                      <Text style={s.dropdownText}>Pending Orders</Text>
                    </Pressable>
                    <View style={s.dropdownDivider} />
                    <Pressable
                      style={s.dropdownItem}
                      onPress={() => { setMenuOpen(false); router.push('/(screens)/redeemed' as any); }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={PURPLE} />
                      <Text style={s.dropdownText}>Redeem History</Text>
                    </Pressable>
                    <View style={s.dropdownDivider} />
                    <Pressable
                      style={s.dropdownItem}
                      onPress={() => { setMenuOpen(false); }}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={PURPLE} />
                      <Text style={s.dropdownText}>How it Works</Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>

        {/* Points balance (right) */}
        <View style={s.balanceRow}>
          <View style={s.starBox}>
            <Ionicons name="cash-outline" size={20} color="#34d399" />
          </View>
          <Text style={[s.balanceValue, { marginLeft: 10 }]}>{MOCK_POINTS}</Text>
        </View>

      </View>

      {/* ── Scrollable rewards sheet ───────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.sheet}>
          <View style={s.handle} />
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((item) => {
                const canAfford  = MOCK_POINTS >= item.pts;
                const outOfStock = item.stock <= 0;
                const lowStock   = !outOfStock && item.stock <= 5;
                const bg         = CARD_COLORS[item.id % CARD_COLORS.length];

                return (
                  <Pressable
                    key={item.id}
                    style={s.card}
                    onPress={() => router.push(`/(screens)/reward/${item.id}` as any)}
                  >
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bg }]} />
                    <View style={s.iconWrap}>
                      <Ionicons name="gift-outline" size={48} color="rgba(255,255,255,0.25)" />
                    </View>
                    <View style={s.scrim} />
                    <View style={[s.pill, s.tl, canAfford ? s.pillW : s.pillP]}>
                      <Text style={[s.pillTxt, { color: canAfford ? PURPLE : '#db2777' }]}>{item.pts}</Text>
                    </View>
                    {outOfStock ? (
                      <View style={[s.pill, s.tr, s.pillDark]}>
                        <Text style={s.pillTxtW}>OUT OF STOCK</Text>
                      </View>
                    ) : lowStock ? (
                      <View style={[s.pill, s.tr, s.pillAmber]}>
                        <Ionicons name="flame" size={10} color="#92400e" />
                        <Text style={[s.pillTxt, { color: '#92400e' }]}>  {item.stock} left</Text>
                      </View>
                    ) : null}
                    <View style={s.cardBottom}>
                      <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                      {!outOfStock && canAfford  && <Text style={s.canAfford}>✓ Can redeem</Text>}
                      {!outOfStock && !canAfford && <Text style={s.deficit}>Need {item.pts - MOCK_POINTS} more pts</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: PURPLE },
  scroll:  { flex: 1 },
  content: { paddingBottom: 110 },

  // Header
  header: { backgroundColor: PURPLE, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  starBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  balanceValue: { fontSize: 26, fontWeight: 'bold', color: '#fff' },

  // Dropdown
  modalBackdrop: { flex: 1 },
  dropdown: { position: 'absolute', top: 100, left: 16, backgroundColor: '#fff', borderRadius: 14, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  dropdownText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e1b4b' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 },

  // Sheet
  sheet: { backgroundColor: '#f5f3ff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 16, paddingHorizontal: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd6fe', alignSelf: 'center', marginBottom: 14 },
  catalogueTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 16 },

  // Grid
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },

  // Card — use flex:1 so width is always calculated correctly
  card: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 5,
  },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(0,0,0,0.55)' },

  // Badges
  pill: { position: 'absolute', flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  tl: { top: 10, left: 10 },
  tr: { top: 10, right: 10 },
  pillW:    { backgroundColor: 'rgba(255,255,255,0.92)' },
  pillP:    { backgroundColor: 'rgba(252,231,243,0.92)' },
  pillDark: { backgroundColor: 'rgba(0,0,0,0.65)' },
  pillAmber:{ backgroundColor: 'rgba(254,243,199,0.95)' },
  pillTxt:  { fontSize: 11, fontWeight: '700' },
  pillTxtW: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },

  // Card body
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18, marginBottom: 3 },
  canAfford:  { fontSize: 10, fontWeight: '600', color: '#86efac' },
  deficit:    { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
});
