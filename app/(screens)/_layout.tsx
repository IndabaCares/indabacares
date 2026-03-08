import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerBackTitle: 'Back',
        animation: 'slide_from_right',
      }}
    />
  );
}
