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

  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [videoReady, setVideoReady]   = useState(false);
  const [shouldPlay, setShouldPlay]   = useState(false);
  const [error, setError]             = useState(false);

  // Fetch video URL on mount
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

  // 2-second delay before playback starts, once video is ready
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => setShouldPlay(true), 2000);
    return () => clearTimeout(timer);
  }, [videoReady]);

  // On error — navigate after a brief pause so the screen isn't a flash
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => navigate(), 2500);
    return () => clearTimeout(timer);
  }, [error]);

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
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping={false}
          onReadyForDisplay={() => setVideoReady(true)}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}

      {/* Spinner while fetching / buffering */}
      {(loading || (videoUrl && !videoReady)) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {/* Dark overlay */}
      <View style={styles.overlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Skip — only shown once video is playing */}
        {videoReady && !error && (
          <TouchableOpacity style={styles.skipBtn} onPress={navigate} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
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
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  safe: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
