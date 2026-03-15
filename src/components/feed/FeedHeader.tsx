import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployee } from '@/providers/EmployeeContext';
import { MoodPromptCard } from '@/components/mood/MoodPromptCard';
import { RECOGNITION_BADGES } from '@/lib/constants';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = 'rgba(255,255,255,0.15)';
const PURPLE_TINT = '#ede9fe';

// ─── Filter types ─────────────────────────────────────────────────────────────

export type FilterCategory = 'latest' | 'badge' | 'department';

export interface FeedFilter {
  category: FilterCategory;
  value:    string;
}

const DEPARTMENTS = [
  'Front Office', 'Concierge', 'Food & Beverage', 'Human Resources',
  'Events', 'Housekeeping', 'Guest Services', 'Operations',
  'Reservations', 'Spa & Wellness',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeedHeaderProps {
  searchTerm:     string;
  onSearchChange: (term: string) => void;
  activeFilter:   FeedFilter | null;
  onFilterChange: (filter: FeedFilter | null) => void;
}

// ─── Checkbox row ─────────────────────────────────────────────────────────────

function CheckRow({
  label, emoji, checked, onPress,
}: { label: string; emoji?: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={cb.row}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={18}
        color={checked ? PURPLE : '#94a3b8'}
      />
      {emoji && <Text style={cb.emoji}>{emoji}</Text>}
      <Text style={[cb.label, checked && cb.labelChecked]}>{label}</Text>
    </Pressable>
  );
}

const cb = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  emoji:        { fontSize: 13 },
  label:        { fontSize: 13, color: '#475569', flex: 1 },
  labelChecked: { color: PURPLE, fontWeight: '700' },
});

// ─── Component ───────────────────────────────────────────────────────────────

export function FeedHeader({ searchTerm, onSearchChange, activeFilter, onFilterChange }: FeedHeaderProps) {
  const { employee } = useEmployee();
  const [moodEmoji,  setMoodEmoji]  = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const firstName = employee?.full_name.split(' ')[0];
  const hour      = new Date().getHours();
  const greeting  =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    onSearchChange('');
    inputRef.current?.blur();
  }

  function handlePick(category: FilterCategory, value: string) {
    const same = activeFilter?.category === category && activeFilter?.value === value;
    onFilterChange(same ? null : { category, value });
  }

  function isChecked(category: FilterCategory, value: string) {
    return activeFilter?.category === category && activeFilter?.value === value;
  }

  const hasFilter = !!activeFilter;

  return (
    <View style={styles.container}>
      <View style={styles.header}>

        {/* Greeting row */}
        <View style={styles.greetingRow}>
          {firstName ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
              <Text style={styles.subtext}>Let's make today great</Text>
            </View>
          ) : null}
          {moodEmoji && <Text style={styles.moodBadge}>{moodEmoji}</Text>}
        </View>

        {/* Mood check-in */}
        <MoodPromptCard onSelect={setMoodEmoji} />

        {/* Search + filter row */}
        <View style={styles.searchRow}>
          <Pressable onPress={searchOpen ? closeSearch : openSearch} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name={searchOpen ? 'close' : 'search-outline'} size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          {searchOpen && (
            <View style={styles.searchBox}>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search by Name or Department"
                placeholderTextColor="#a78bca"
                value={searchTerm}
                onChangeText={onSearchChange}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchTerm.length > 0 && (
                <Pressable onPress={() => onSearchChange('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color="#a78bca" />
                </Pressable>
              )}
            </View>
          )}

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => setFilterOpen((v) => !v)}
            style={[styles.iconBtn, hasFilter && styles.iconBtnActive]}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={20} color={hasFilter ? PURPLE : 'rgba(255,255,255,0.85)'} />
          </Pressable>
        </View>

        {/* ── Inline checkbox dropdown ──────────────────────── */}
        {filterOpen && (
          <View style={styles.dropdown}>
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>

              {/* Sort */}
              <Text style={styles.groupLabel}>Sort</Text>
              <CheckRow
                label="Latest"
                emoji="🕐"
                checked={isChecked('latest', 'latest')}
                onPress={() => handlePick('latest', 'latest')}
              />

              <View style={styles.divider} />

              {/* Badges */}
              <Text style={styles.groupLabel}>Badge</Text>
              {RECOGNITION_BADGES.map((b) => (
                <CheckRow
                  key={b.value}
                  label={b.value}
                  emoji={b.emoji}
                  checked={isChecked('badge', b.value)}
                  onPress={() => handlePick('badge', b.value)}
                />
              ))}

              <View style={styles.divider} />

              {/* Departments */}
              <Text style={styles.groupLabel}>Department</Text>
              {DEPARTMENTS.map((dept) => (
                <CheckRow
                  key={dept}
                  label={dept}
                  checked={isChecked('department', dept)}
                  onPress={() => handlePick('department', dept)}
                />
              ))}

            </ScrollView>

            {/* Clear button */}
            {hasFilter && (
              <Pressable onPress={() => { onFilterChange(null); setFilterOpen(false); }} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear filter</Text>
              </Pressable>
            )}
          </View>
        )}

      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { marginBottom: 0 },

  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  greeting:    { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  subtext:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  moodBadge:   { fontSize: 36, marginLeft: 8 },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },

  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PURPLE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: '#fff' },

  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 9, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e1b4b', padding: 0 },

  // ── Dropdown ───────────────────────────────────────────────────────────────
  dropdown: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    marginTop: 4,
  },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  clearBtn: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});
