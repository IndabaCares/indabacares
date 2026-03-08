import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClaimEmployeeCode, useLogout } from '@/hooks/use-auth';
import { employeeCodeSchema } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

export default function EmployeeCodeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hotelName } = useLocalSearchParams<{ hotelName?: string }>();
  const [code, setCode]           = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();

  const claimCode = useClaimEmployeeCode();
  const logout    = useLogout();

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase());
    setCodeError(undefined);
  };

  const handleSubmit = () => {
    const result = employeeCodeSchema.safeParse({ code });
    if (!result.success) {
      setCodeError(result.error.issues[0].message);
      return;
    }

    claimCode.mutate(result.data, {
      onSuccess: (data) => {
        const companyName  = data.company?.name         ?? 'your hotel';
        const companyId    = data.company?.id            ?? '';
        const primaryColor = data.company?.primaryColor  ?? '#CE21FB';
        const logoUrl      = data.company?.logoUrl       ?? '';

        router.push({
          pathname: '/(onboarding)/confirm-hotel',
          params: { companyName, companyId, primaryColor, logoUrl },
        });
      },
      onError: (err: Error) => {
        setCodeError(err.message);
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand strip */}
        <View
          className="items-center px-6 pb-10"
          style={{ paddingTop: insets.top + 40, backgroundColor: '#CE21FB' }}
        >
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Text className="text-3xl font-bold text-white">IC</Text>
          </View>
          <Text className="text-2xl font-bold text-white">
            {hotelName ?? 'Join your team'}
          </Text>
          <Text className="mt-1 text-sm text-white/70">Enter the code from your manager</Text>
        </View>

        {/* Form */}
        <View className="flex-1 rounded-t-3xl bg-white px-6" style={{ marginTop: -16, paddingTop: 32 }}>
          <Text className="mb-1 text-xl font-bold text-slate-900">Employee Code</Text>
          <Text className="mb-6 text-sm text-slate-500">
            {hotelName
              ? `Enter the unique code your ${hotelName} manager gave you.`
              : 'Your administrator assigned you a unique code to link your account to your hotel.'}
          </Text>

          <TextInput
            label="Your code"
            placeholder="e.g. INDABA01"
            value={code}
            onChangeText={handleCodeChange}
            error={codeError}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {claimCode.isError && !codeError && (
            <Text className="mb-4 text-center text-sm text-danger-500">
              {(claimCode.error as Error).message}
            </Text>
          )}

          <Button
            title="Continue"
            onPress={handleSubmit}
            loading={claimCode.isPending}
            size="lg"
          />

          <Pressable
            onPress={() => logout.mutate()}
            disabled={logout.isPending}
            className="mt-6 items-center"
          >
            <Text className="text-sm text-slate-400">Wrong account? Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
