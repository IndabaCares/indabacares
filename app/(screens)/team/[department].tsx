import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTeamByDepartment } from '@/hooks/use-team';
import type { TeamMember } from '@/api/team-service';

const PURPLE = '#7B1FA2';

// ─── Member card ──────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: TeamMember }) {
  const initials = member.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.card}
      onPress={() => router.push(`/(screens)/user/${member.id}` as any)}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {member.photo_url ? (
          <Image
            source={{ uri: member.photo_url }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{member.full_name}</Text>
        {member.job_title ? (
          <Text style={styles.jobTitle} numberOfLines={1}>{member.job_title}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TeamDepartmentScreen() {
  const { department: raw } = useLocalSearchParams<{ department: string }>();
  const department = decodeURIComponent(raw ?? '');
  const { data: members = [], isLoading, isError } = useTeamByDepartment(department);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{department}</Text>
          <View style={{ width: 38 }} />
        </View>
        {!isLoading && (
          <Text style={styles.subtitle}>
            {members.length} {members.length === 1 ? 'team member' : 'team members'}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {isLoading && (
          <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
        )}

        {isError && (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={48} color="#fca5a5" />
            <Text style={styles.emptyText}>Failed to load team</Text>
          </View>
        )}

        {!isLoading && !isError && members.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No team members found</Text>
          </View>
        )}

        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F2' },

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
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 10,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: 48,
    height: 48,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '700',
    color: PURPLE,
  },

  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  jobTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
  },
});
