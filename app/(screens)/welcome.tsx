import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { getWelcomeVideoUrl } from '@/api/initiative-service';

export default function WelcomeScreen() {
  const { employee, markWelcomeSeen } = useEmployee();
  const videoRef = useRef<Video>(null);

  const [videoUrl, setVideoUrl]     = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  // Fetch video URL on mount
  useEffect(() => {
    if (!employee) return;
    getWelcomeVideoUrl(employee.hotel).then(setVideoUrl);
  }, [employee]);

  // 2-second delay after video is ready before playback starts
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => setShouldPlay(true), 2000);
    return () => clearTimeout(timer);
  }, [videoReady]);

  async function navigate() {
    await markWelcomeSeen();
    router.replace('/(tabs)/profile');
  }

  function handlePlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    if (status.didJustFinish) navigate();
  }

  return (
    <View style={styles.container}>
      {/* Full-screen video */}
      {videoUrl && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={shouldPlay}
          isLooping={false}
          onReadyForDisplay={() => setVideoReady(true)}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}

      {/* Spinner while buffering */}
      {!videoReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Subtle dark overlay */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Skip button — bottom right, visible once playing */}
      {videoReady && (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <TouchableOpacity style={styles.skipBtn} onPress={navigate} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  safe: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 24,
  },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
});
