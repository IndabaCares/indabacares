import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});

  const login = useLogin();

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand header */}
        <View
          className="items-center px-6 pb-10"
          style={{ paddingTop: insets.top + 32, backgroundColor: '#CE21FB' }}
        >
          <View className="mb-5 w-72 overflow-hidden rounded-2xl bg-white px-6 py-4">
            <Image
              source={require('../../assets/IndabaCaresLogo.png')}
              style={{ width: '100%', height: 80 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-base text-white/80">
            Recognise. Reward. Celebrate.
          </Text>
        </View>

        {/* Form card */}
        <View
          className="flex-1 rounded-t-3xl bg-white px-6"
          style={{ marginTop: -16, paddingBottom: insets.bottom + 24, paddingTop: 32 }}
        >
          <Text className="mb-6 text-xl font-bold text-slate-900">Welcome back</Text>

          <TextInput
            label="Email address"
            placeholder="you@indabagroup.com"
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
              <Text className="text-sm font-medium text-primary-500">Forgot password?</Text>
            </Pressable>
          </Link>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={login.isPending}
            size="lg"
          />

          {login.isError && (
            <Text className="mt-3 text-center text-sm text-danger-500">
              {login.error.message}
            </Text>
          )}

          {/* Sign Up Link */}
          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-slate-500">Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text className="text-sm font-bold text-primary-500">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
