import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInitiativeThumbnails } from '@/hooks/use-initiatives';

const PURPLE = '#7B1FA2';

// ─── Static initiative config ─────────────────────────────────────────────────

const INITIATIVES = [
  { label: 'Billy Says',    sub: 'Litter Brigade', slug: 'billy-says',    dbTab: 'Billy Says'    },
  { label: 'Feed the Kids', sub: 'Diepsloot Schools Project', slug: 'feed-the-kids', dbTab: 'Feed the Kids' },
  { label: 'Mandela Day',   sub: '',               slug: 'mandela-day',   dbTab: 'Mandela Day'   },
  { label: 'Mobile Clinic', sub: '',               slug: 'mobile-clinic', dbTab: 'Mobile Clinic' },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IndabaCaresListScreen() {
  const { data: thumbnails = [], isLoading } = useInitiativeThumbnails();

  // Build a quick slug→mascot_url lookup
  const thumbMap = Object.fromEntries(thumbnails.map(t => [t.tab, t.mascot_url]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Indaba Cares</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.subtitle}>Choose an initiative to explore</Text>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.body}>
        {INITIATIVES.map((item) => {
          const imageUrl = thumbMap[item.dbTab] ?? null;

          return (
            <TouchableOpacity
              key={item.slug}
              activeOpacity={0.75}
              style={styles.row}
              onPress={() => router.push(`/(screens)/initiative/${item.slug}` as any)}
            >
              {/* Thumbnail image or loading placeholder */}
              <View style={styles.thumb}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={PURPLE} />
                ) : imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumbImage}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons name="ribbon-outline" size={22} color={PURPLE} />
                )}
              </View>

              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.rowSub}>{item.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: 56,
    height: 56,
  },

  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  rowSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
