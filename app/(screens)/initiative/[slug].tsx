/**
 * Initiative detail screen
 *
 * PERF-02: expo-av is lazy-loaded — it is NOT included in the main JS bundle.
 *           The Video components mount only when this screen is visited AND a
 *           video URI is actually present.
 * PERF-04: RN <Image> replaced with OptimizedImage (expo-image, blur placeholder,
 *           memory-disk cache, fade-in transition).
 */

import React, { useState, Suspense, lazy } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Pressable, Modal, ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInitiatives } from '@/hooks/use-initiatives';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { Initiative } from '@/api/initiative-service';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';

// ─── Lazy video (PERF-02) ─────────────────────────────────────────────────────

const LazyVideoHero = lazy(() =>
  import('./VideoComponents').then((m) => ({ default: m.VideoHero }))
);

const LazyVideoBlock = lazy(() =>
  import('./VideoComponents').then((m) => ({ default: m.VideoBlock }))
);

function isVideoUrl(url: string) {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

// ─── Initiative content block ─────────────────────────────────────────────────

function InitiativeBlock({ item }: { item: Initiative }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={vs.block}>
      {/* Hero: video or image */}
      {item.mascot_url ? (
        isVideoUrl(item.mascot_url) ? (
          <Suspense fallback={<View style={vs.videoPlaceholder}><ActivityIndicator color={PURPLE} /></View>}>
            <LazyVideoHero uri={item.mascot_url} />
          </Suspense>
        ) : (
          <View style={vs.card}>
            <OptimizedImage
              uri={item.mascot_url}
              style={vs.heroImage}
              contentFit="contain"
            />
          </View>
        )
      ) : null}

      {/* Secondary video */}
      {item.video_url ? (
        <Suspense fallback={<View style={vs.videoPlaceholder}><ActivityIndicator color={PURPLE} /></View>}>
          <LazyVideoBlock uri={item.video_url} />
        </Suspense>
      ) : null}

      {/* Photo grid */}
      {item.image_urls.length > 0 && (
        <View style={vs.grid}>
          {item.image_urls.map((url, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              onPress={() => setExpanded(i)}
              style={vs.photoWrap}
            >
              <OptimizedImage uri={url} style={vs.photo} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Lightbox */}
      <Modal
        visible={expanded !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(null)}
      >
        <Pressable style={vs.overlay} onPress={() => setExpanded(null)}>
          <View style={vs.lightbox}>
            {expanded !== null && (
              <OptimizedImage
                uri={item.image_urls[expanded]}
                style={vs.lightboxImage}
                contentFit="cover"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InitiativeDetailScreen() {
  // `slug` is the initiative tab name (e.g. "Billy Says").
  // `hotel` is the property chosen on the hotel-picker screen.
  const { slug, hotel } = useLocalSearchParams<{ slug: string; hotel: string }>();

  const { data = [], isLoading, isError } = useInitiatives(hotel ?? '', slug ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{slug}</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {isLoading && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={PURPLE} />
          </View>
        )}

        {isError && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={PURPLE_SOFT} />
            <Text style={styles.emptyTitle}>Failed to load</Text>
            <Text style={styles.emptyText}>Please check your connection and try again.</Text>
          </View>
        )}

        {!isLoading && !isError && data.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={56} color={PURPLE_SOFT} />
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptyText}>Content for this initiative will appear here.</Text>
          </View>
        )}

        {data.map((item) => (
          <InitiativeBlock key={item.id} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vs = StyleSheet.create({
  block: { marginBottom: 16 },
  card:  { backgroundColor: 'transparent', marginBottom: 16 },

  heroImage:  { width: '100%', height: undefined, aspectRatio: 1 },
  photo:      { width: '100%', height: '100%' },
  lightboxImage: { width: '100%', height: '100%' },

  videoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  photoWrap: {
    width: '48.5%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightbox: {
    width: '88%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F2' },
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 38, height: 38,
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
  body: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 14,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e1b4b' },
  emptyText: {
    fontSize: 14, color: '#94a3b8',
    textAlign: 'center', lineHeight: 22, maxWidth: 260,
  },
});
