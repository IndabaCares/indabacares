import '../global.css';
import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastProvider } from '@/providers/ToastProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <RealtimeProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <Slot />
              </ToastProvider>
            </RealtimeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
