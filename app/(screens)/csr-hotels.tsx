import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInitiativeHotels } from '@/hooks/use-initiatives';

const PURPLE = '#7B1FA2';

// Logo images for hotels that have assets
const HOTEL_LOGOS: Record<string, ReturnType<typeof require>> = {
  'Indaba Hotel':              require('../../assets/indabahotel.png'),
  'Indaba Lodge Richards Bay': require('../../assets/indabalodgerichardsbay.png'),
  'Indaba Lodge Gaborone':     require('../../assets/indabalodgegaborone.png'),
  'Chobe Safari Lodge':        require('../../assets/chobesafarilodge.png'),
  'Nata Lodge':                require('../../assets/natalodge.png'),
};

// Fallback Ionicons for hotels without a logo asset
const HOTEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  'African Procurement Agencies': 'briefcase-outline',
};

const DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'business-outline';

export default function CSRHotelsScreen() {
  const { data: hotels = [], isLoading, isError } = useInitiativeHotels();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Events</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.subtitle}>Choose a property to explore their CSR projects</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#e2d9f3" />
            <Text style={styles.emptyTitle}>Could not load hotels</Text>
            <Text style={styles.emptyText}>Please check your connection and try again.</Text>
          </View>
        )}

        {!isLoading && !isError && hotels.length === 0 && (
          <View style={styles.center}>
            <Ionicons name="ribbon-outline" size={56} color="#e2d9f3" />
            <Text style={styles.emptyTitle}>No CSR content yet</Text>
            <Text style={styles.emptyText}>Check back soon — initiatives will appear here.</Text>
          </View>
        )}

        {hotels.map((hotel) => (
          <TouchableOpacity
            key={hotel}
            activeOpacity={0.75}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/(screens)/initiatives',
                params: { hotel },
              })
            }
          >
            <View style={styles.iconWrap}>
              {HOTEL_LOGOS[hotel] ? (
                <Image
                  source={HOTEL_LOGOS[hotel]}
                  style={styles.hotelLogo}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name={HOTEL_ICON[hotel] ?? DEFAULT_ICON}
                  size={24}
                  color={PURPLE}
                />
              )}
            </View>
            <Text style={styles.rowLabel}>{hotel}</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },

  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },

  center: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hotelLogo: {
    width: 44,
    height: 44,
  },

  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});
