import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmployee } from '@/providers/EmployeeContext';

const PURPLE      = '#7B1FA2';
const PURPLE_SOFT = '#f3e8ff';

interface FeedHeaderProps {
  searchTerm:      string;
  onSearchChange:  (term: string) => void;
}

export function FeedHeader({ searchTerm, onSearchChange }: FeedHeaderProps) {
  const { employee } = useEmployee();

  const firstName = employee?.full_name.split(' ')[0];
  const hour      = new Date().getHours();
  const greeting  =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      <View style={styles.header}>

        {/* Greeting */}
        {firstName ? (
          <>
            <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
            <Text style={styles.subtext}>Let's make today great</Text>
          </>
        ) : null}

        {/* Search bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={PURPLE} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, badge, department, date…"
            placeholderTextColor="#a78bca"
            value={searchTerm}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchTerm.length > 0 && (
            <Ionicons
              name="close-circle"
              size={16}
              color="#a78bca"
              onPress={() => onSearchChange('')}
            />
          )}
        </View>

      </View>
    </View>
  );
}

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

  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    marginBottom: 14,
  },

  searchBox: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  '#ffffff',
    borderRadius:     14,
    paddingHorizontal: 12,
    paddingVertical:   9,
    gap: 8,
  },

  searchIcon: { marginRight: 2 },

  searchInput: {
    flex:      1,
    fontSize:  14,
    color:     '#1e1b4b',
    padding:   0,
  },
});
