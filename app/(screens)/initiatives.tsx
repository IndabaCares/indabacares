import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, Pressable, Modal, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { useInitiatives } from '@/hooks/use-initiatives';
import type { Initiative } from '@/api/initiative-service';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';
const HALF_SCREEN = Dimensions.get('window').height * 0.45;

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Billy Says',  slug: 'billy-says'   },
  { label: 'FeedtheKids', slug: 'feed-the-kids' },
  { label: 'MandelaDay',  slug: 'mandela-day'   },
] as const;

type TabSlug = typeof TABS[number]['slug'];

// ─── Video hero (half-screen preview → lightbox on tap) ──────────────────────

function VideoHero({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Half-screen preview — tap to expand ── */}
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

      {/* ── Lightbox — full playback, tap outside to close ── */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
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
                if ('didJustFinish' in status && status.didJustFinish) {
                  setOpen(false);
                }
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Secondary video block (non-hero) ────────────────────────────────────────

function VideoBlock({ uri }: { uri: string }) {
  return (
    <View style={vs.videoWrap}>
      <Video
        source={{ uri }}
        style={vs.video}
        resizeMode={ResizeMode.COVER}
        useNativeControls
        isLooping
      />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVideoUrl(url: string) {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

// ─── Initiative content block ─────────────────────────────────────────────────

function InitiativeBlock({ item }: { item: Initiative }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={vs.block}>

      {/* Hero slot — video preview or image */}
      {item.mascot_url ? (
        isVideoUrl(item.mascot_url) ? (
          <VideoHero uri={item.mascot_url} />
        ) : (
          <View style={vs.card}>
            <Image source={{ uri: item.mascot_url }} style={vs.heroImage} resizeMode="contain" />
          </View>
        )
      ) : null}

      {/* Secondary video */}
      {item.video_url ? <VideoBlock uri={item.video_url} /> : null}

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
              <Image source={{ uri: url }} style={vs.photo} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Photo lightbox */}
      <Modal
        visible={expanded !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(null)}
      >
        <Pressable style={vs.overlay} onPress={() => setExpanded(null)}>
          <View style={vs.lightbox}>
            {expanded !== null && (
              <Image
                source={{ uri: item.image_urls[expanded] }}
                style={vs.lightboxImage}
                resizeMode="cover"
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function InitiativeTab({ slug }: { slug: TabSlug }) {
  const { data = [], isLoading, isError } = useInitiatives(slug);

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={PURPLE} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={48} color={PURPLE_SOFT} />
        <Text style={styles.emptyTitle}>Failed to load</Text>
        <Text style={styles.emptyText}>Please check your connection and try again.</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="ribbon-outline" size={56} color={PURPLE_SOFT} />
        <Text style={styles.emptyTitle}>Coming Soon</Text>
        <Text style={styles.emptyText}>Content for this initiative will appear here.</Text>
      </View>
    );
  }

  return (
    <>
      {data.map(item => (
        <InitiativeBlock key={item.id} item={item} />
      ))}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InitiativesScreen() {
  const [activeSlug, setActiveSlug] = useState<TabSlug>('billy-says');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F2' }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Indaba Cares Initiatives</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.tabPill}>
          {TABS.map(({ label, slug }) => {
            const active = activeSlug === slug;
            return (
              <Pressable
                key={slug}
                onPress={() => setActiveSlug(slug)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <InitiativeTab slug={activeSlug} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vs = StyleSheet.create({
  block: { marginBottom: 16 },
  card:  { backgroundColor: 'transparent', marginBottom: 16 },

  heroImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },

  // Half-screen preview
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
    gap: 10,
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
  tapLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Video lightbox (same overlay pattern as photos)
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

  // Secondary video
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  video: { flex: 1 },

  // Photo grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
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

  // Photo lightbox
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
    marginBottom: 16,
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
  tabTextActive: { color: PURPLE },
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
