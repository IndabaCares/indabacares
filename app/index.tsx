import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
