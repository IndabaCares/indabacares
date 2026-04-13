import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEmployee } from '@/providers/EmployeeContext';
import { getWelcomeVideoUrl } from '@/api/initiative-service';

const { width, height } = Dimensions.get('window');
const PURPLE = '#7B1FA2';

export default function WelcomeScreen() {
  const { employee, markWelcomeSeen } = useEmployee();
  const videoRef = useRef<Video>(null);

  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [finished, setFinished]     = useState(false);
  const [error, setError]           = useState(false);

  // Fetch the welcome video URL
  useEffect(() => {
    if (!employee) return;
    getWelcomeVideoUrl(employee.hotel)
      .then((url) => {
        setVideoUrl(url);
        setLoading(false);
        if (!url) setError(true);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [employee]);

  async function handleGetStarted() {
    await markWelcomeSeen();
    router.replace('/(tabs)/profile');
  }

  function handlePlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    if (status.didJustFinish) setFinished(true);
  }

  return (
    <View style={styles.container}>
      {/* Full-screen video background */}
      {videoUrl && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onReadyForDisplay={() => setVideoReady(true)}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}

      {/* Loading spinner while video fetches */}
      {(loading || (videoUrl && !videoReady)) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Dark gradient overlay for readability */}
      <View style={styles.overlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top — welcome copy */}
        <View style={styles.topContent}>
          <Text style={styles.welcomeLabel}>WELCOME TO</Text>
          <Text style={styles.appName}>IndabaCares</Text>
          <Text style={styles.greeting}>
            {employee?.full_name ? `Hi ${employee.full_name.split(' ')[0]}!` : 'Hi there!'}
          </Text>
        </View>

        {/* Error state — no video found */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="play-circle-outline" size={64} color="rgba(255,255,255,0.4)" />
            <Text style={styles.errorText}>Welcome video coming soon</Text>
          </View>
        )}

        {/* Bottom — CTA */}
        <View style={styles.bottomContent}>
          {(finished || error) && (
            <Text style={styles.tagline}>
              Recognise. Reward. Belong.
            </Text>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color={PURPLE} />
          </TouchableOpacity>

          {/* Skip — visible while video is playing */}
          {!finished && !error && videoReady && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleGetStarted}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── Top ─────────────────────────────────────────────────────────────────────
  topContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  welcomeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    marginBottom: 4,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorBox: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Bottom ──────────────────────────────────────────────────────────────────
  bottomContent: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 14,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: PURPLE,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
});
