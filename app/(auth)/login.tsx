import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin, useMagicLink } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const login = useLogin();
  const magicLink = useMagicLink();

  const updateField = (key: keyof LoginInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleLogin = () => {
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    login.mutate(result.data);
  };

  const handleMagicLink = () => {
    if (!form.email) {
      setErrors({ email: 'Please enter your email' });
      return;
    }
    magicLink.mutate(form.email, {
      onSuccess: () => setMagicLinkSent(true),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-500">
            <Text className="text-3xl font-bold text-white">IC</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">Welcome back</Text>
          <Text className="mt-1 text-base text-slate-500">Sign in to IndabaCares</Text>
        </View>

        {/* Magic Link Sent State */}
        {magicLinkSent ? (
          <View className="items-center rounded-2xl bg-success-50 p-6">
            <Text className="text-4xl">📧</Text>
            <Text className="mt-3 text-center text-lg font-semibold text-slate-800">
              Check your email
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              We sent a magic link to {form.email}. Click the link to sign in.
            </Text>
            <Button
              title="Back to login"
              variant="ghost"
              onPress={() => setMagicLinkSent(false)}
              className="mt-4"
            />
          </View>
        ) : showMagicLink ? (
          /* Magic Link Form */
          <View>
            <TextInput
              label="Email"
              placeholder="you@company.com"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Button
              title="Send Magic Link"
              onPress={handleMagicLink}
              loading={magicLink.isPending}
            />
            <Pressable onPress={() => setShowMagicLink(false)} className="mt-4 items-center">
              <Text className="text-sm text-primary-500">Use password instead</Text>
            </Pressable>
          </View>
        ) : (
          /* Password Form */
          <View>
            <TextInput
              label="Email"
              placeholder="you@company.com"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              label="Password"
              placeholder="Enter your password"
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              error={errors.password}
              secureTextEntry
              autoComplete="password"
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="mb-6 self-end">
                <Text className="text-sm text-primary-500">Forgot password?</Text>
              </Pressable>
            </Link>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
            />

            {login.isError && (
              <Text className="mt-3 text-center text-sm text-danger-500">
                {login.error.message}
              </Text>
            )}

            <Pressable onPress={() => setShowMagicLink(true)} className="mt-4 items-center">
              <Text className="text-sm text-primary-500">Use magic link instead</Text>
            </Pressable>
          </View>
        )}

        {/* Sign Up Link */}
        <View className="mt-8 flex-row items-center justify-center">
          <Text className="text-sm text-slate-500">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary-500">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
