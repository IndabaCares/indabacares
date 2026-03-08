import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignUp } from '@/hooks/use-auth';
import { signUpSchema, type SignUpInput } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [form, setForm] = useState<SignUpInput>({
    fullName: '',
    email: '',
    password: '',
    inviteToken: token,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
  const [success, setSuccess] = useState(false);

  const signUp = useSignUp();

  const updateField = (key: keyof SignUpInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSignUp = () => {
    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    signUp.mutate(result.data, {
      onSuccess: () => setSuccess(true),
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
        <View className="mb-8 items-center">
          <Text className="text-2xl font-bold text-slate-900">Create Account</Text>
          <Text className="mt-1 text-base text-slate-500">
            {token ? 'Complete your invitation' : 'Join IndabaCares'}
          </Text>
        </View>

        {success ? (
          <View className="items-center rounded-2xl bg-success-50 p-6">
            <Text className="mt-3 text-center text-lg font-semibold text-slate-800">
              Account created successfully!
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              You're all set. Tap below to get started.
            </Text>
            <View className="mt-4 w-full">
              <Button
                title="Continue to Home"
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </View>
        ) : (
          <View>
            <TextInput
              label="Full Name"
              placeholder="Jane Doe"
              value={form.fullName}
              onChangeText={(v) => updateField('fullName', v)}
              error={errors.fullName}
              autoComplete="name"
            />

            <TextInput
              label="Email"
              placeholder="jane@company.com"
              value={form.email}
              onChangeText={(v) => updateField('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              label="Password"
              placeholder="Min 8 chars with letters and digits"
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              error={errors.password}
              secureTextEntry
              autoComplete="new-password"
            />

            {!token && (
              <TextInput
                label="Company Name"
                placeholder="Your company name"
                value={form.companyName || ''}
                onChangeText={(v) => updateField('companyName', v)}
                error={errors.companyName}
              />
            )}

            <View className="mt-4">
              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={signUp.isPending}
              />
            </View>

            {signUp.isError && (
              <Text className="mt-3 text-center text-sm text-danger-500">
                {signUp.error.message}
              </Text>
            )}
          </View>
        )}

        <View className="mt-8 flex-row items-center justify-center">
          <Text className="text-sm text-slate-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary-500">Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
