import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmployeeAuthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center bg-white px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-2xl font-bold text-slate-900">
        Employee Authentication
      </Text>
      <Text className="mt-3 text-center text-base text-slate-500">
        (New authentication system loading)
      </Text>
    </View>
  );
}
