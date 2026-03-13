import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useEmployee } from '@/providers/EmployeeContext';

const PURPLE = '#7B1FA2';


export function FeedHeader() {
  const { employee } = useEmployee();

  const firstName = employee?.full_name.split(' ')[0];
  const hour      = new Date().getHours();
  const greeting  =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>

      {/* Purple header section */}
      <View style={styles.header}>

        {/* Greeting */}
        {firstName ? (
          <>
            <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
            <Text style={styles.subtext}>Let's make today great</Text>
          </>
        ) : null}

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },

  header: {
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
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
    marginBottom: 16,
  },

});
