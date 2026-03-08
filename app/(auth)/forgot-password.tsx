import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const forgotPassword = useForgotPassword();

  const handleSubmit = () => {
    if (!email) return;
    forgotPassword.mutate(email, {
      onSuccess: () => setSent(true),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      {/* Back icon */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        className="ml-4 mt-3 h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
      >
        <Ionicons name="chevron-back" size={26} color="#0f172a" />
      </Pressable>

      <View className="flex-1 px-6 pt-6">
        <Text className="mb-2 text-2xl font-bold text-slate-900">Reset Password</Text>
        <Text className="mb-8 text-base text-slate-500">
          Enter your email and we'll send you a reset link.
        </Text>

        {sent ? (
          <View className="items-center rounded-2xl bg-success-50 p-6">
            <Text className="text-4xl">📧</Text>
            <Text className="mt-3 text-center text-lg font-semibold text-slate-800">
              Check your email
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              We sent a password reset link to {email}
            </Text>
          </View>
        ) : (
          <View>
            <TextInput
              label="Email"
              placeholder="you@indabagroup.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Button
              title="Send Reset Link"
              onPress={handleSubmit}
              loading={forgotPassword.isPending}
            />
            {forgotPassword.isError && (
              <Text className="mt-3 text-center text-sm text-danger-500">
                {forgotPassword.error.message}
              </Text>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
