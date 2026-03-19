import React, { useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, Pressable, Modal, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { useInitiatives } from '@/hooks/use-initiatives';
import type { Initiative } from '@/api/initiative-service';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';
const HALF_SCREEN = Dimensions.get('window').height * 0.45;

// ─── Label map ────────────────────────────────────────────────────────────────

// Maps URL slug → DB tab value (for content query) and display label.
// Note: 'billy-says' content lives under tab='billy-says' (video+photos),
// while the list thumbnail uses tab='Billy Says' (image). They are separate rows.
const SLUG_MAP: Record<string, { label: string; dbTab: string }> = {
  'billy-says':    { label: 'Billy Says',    dbTab: 'billy-says'    },
  'feed-the-kids': { label: 'Feed the Kids', dbTab: 'Feed the Kids' },
  'mandela-day':   { label: 'Mandela Day',   dbTab: 'Mandela Day'   },
  'mobile-clinic': { label: 'Mobile Clinic', dbTab: 'Mobile Clinic' },
};

// ─── Video hero (half-screen preview → lightbox on tap) ──────────────────────

function VideoHero({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(true)} style={vs.previewWrap}>
        <Video
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isMuted
          isLooping={false}
          pointerEvents="none"
        />
        <View style={vs.previewOverlay}>
          <View style={vs.playBtn}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={vs.overlay} onPress={() => setOpen(false)}>
          <View style={vs.videoLightbox}>
            <Video
              source={{ uri }}
              style={{ flex: 1 }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              isLooping={false}
              onPlaybackStatusUpdate={status => {
                if ('didJustFinish' in status && status.didJustFinish) setOpen(false);
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Secondary video block ────────────────────────────────────────────────────

function VideoBlock({ uri }: { uri: string }) {
  return (
    <View style={vs.videoWrap}>
      <Video source={{ uri }} style={vs.video} resizeMode={ResizeMode.COVER} useNativeControls isLooping />
    </View>
  );
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

// ─── Initiative content block ─────────────────────────────────────────────────

function InitiativeBlock({ item }: { item: Initiative }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={vs.block}>
      {item.mascot_url ? (
        isVideoUrl(item.mascot_url) ? (
          <VideoHero uri={item.mascot_url} />
        ) : (
          <View style={vs.card}>
            <Image source={{ uri: item.mascot_url }} style={vs.heroImage} resizeMode="contain" />
          </View>
        )
      ) : null}

      {item.video_url ? <VideoBlock uri={item.video_url} /> : null}

      {item.image_urls.length > 0 && (
        <View style={vs.grid}>
          {item.image_urls.map((url, i) => (
            <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => setExpanded(i)} style={vs.photoWrap}>
              <Image source={{ uri: url }} style={vs.photo} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={expanded !== null} transparent animationType="fade" onRequestClose={() => setExpanded(null)}>
        <Pressable style={vs.overlay} onPress={() => setExpanded(null)}>
          <View style={vs.lightbox}>
            {expanded !== null && (
              <Image source={{ uri: item.image_urls[expanded] }} style={vs.lightboxImage} resizeMode="cover" />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InitiativeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { label = slug, dbTab = slug } = SLUG_MAP[slug] ?? {};
  const { data = [], isLoading, isError } = useInitiatives(dbTab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{label}</Text>
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

        {data.map(item => (
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

  heroImage: { width: '100%', height: undefined, aspectRatio: 1 },

  previewWrap: {
    width: '100%',
    height: HALF_SCREEN,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoLightbox: {
    width: '92%',
    aspectRatio: 9 / 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },

  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  video: { flex: 1 },

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
  photo: { width: '100%', height: '100%' },

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
  lightboxImage: { width: '100%', height: '100%' },
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
});
