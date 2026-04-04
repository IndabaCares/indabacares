import '../global.css';
import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { EmployeeProvider } from '@/providers/EmployeeContext';
import { AuthProvider } from '@/providers/AuthProvider';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryProvider>
            <EmployeeProvider>
              <AuthProvider>
                <RealtimeProvider>
                  <ToastProvider>
                    <StatusBar style="dark" />
                    <Slot />
                  </ToastProvider>
                </RealtimeProvider>
              </AuthProvider>
            </EmployeeProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
