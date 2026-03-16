import React, { useState } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, Pressable,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#ede9fe';

const TABS = ['Billy Says', 'FeedtheKids', 'MandelaDay'] as const;
type Tab = typeof TABS[number];

// ─── Billy Says tab ───────────────────────────────────────────────────────────

function BillySaysTab() {
  return (
    <View style={vs.container}>
      <Image
        source={require('../../assets/Billy.png')}
        style={vs.image}
        resizeMode="contain"
      />
    </View>
  );
}

const vs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InitiativesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('Billy Says');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F2' }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Initiatives</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.tabPill}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {activeTab === 'Billy Says' ? (
          <BillySaysTab />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={56} color={PURPLE_SOFT} />
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptyText}>{activeTab} content will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  tabTextActive: {
    color: PURPLE,
  },

  body: {
    flexGrow: 1,
    padding: 16,
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
