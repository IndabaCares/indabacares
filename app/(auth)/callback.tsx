import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Callback session error:', error);
          router.replace('/(auth)/login');
          return;
        }

        router.replace('/(tabs)');
      } else {
        // No tokens, might be an error or redirect
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#CE21FB" />
      <Text className="mt-4 text-base text-slate-500">Signing you in...</Text>
    </View>
  );
}
