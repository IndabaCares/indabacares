import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const session    = useAuthStore((s) => s.session);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#CE21FB" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/employee-auth" />;
  }

  const isLinked = !!session.user?.app_metadata?.company_id;

  if (!isLinked) {
    return <Redirect href="/(onboarding)/employee-code" />;
  }

  return <Redirect href="/(tabs)" />;
}
