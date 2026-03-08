import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSignUp } from '@/hooks/use-auth';
import { signUpSchema, type SignUpInput } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

// ─── Hotel list ──────────────────────────────────────────────────────────────
const HOTELS = [
  'Indaba Hotel',
  'IndabaLodge Richards Bay',
  'IndabaLodge Gaborone',
  'Chobe Fish Eagle',
  'Nata Lodge',
] as const;

// ─── Hotel picker — inline expanding dropdown ─────────────────────────────────
function HotelPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (name: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">Your Hotel</Text>

      {/* Trigger */}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className={`flex-row items-center rounded-2xl border bg-white px-4 py-3.5 ${
          error ? 'border-danger-500' : open ? 'border-primary-400' : 'border-slate-200'
        }`}
      >
        <Text className={`flex-1 text-base ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'Select your hotel'}
        </Text>
        <Text className="text-slate-400">{open ? '▲' : '▼'}</Text>
      </Pressable>

      {error && <Text className="mt-1 text-xs text-danger-500">{error}</Text>}

      {/* Dropdown list */}
      {open && (
        <View className="mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {HOTELS.map((hotel, index) => (
            <Pressable
              key={hotel}
              onPress={() => {
                onChange(hotel);
                setOpen(false);
              }}
              className={`px-4 py-3.5 active:bg-primary-50 ${
                hotel === value ? 'bg-primary-50' : 'bg-white'
              } ${index < HOTELS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <Text
                className={`text-base ${
                  hotel === value ? 'font-semibold text-primary-600' : 'text-slate-800'
                }`}
              >
                {hotel}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
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
  const [selectedHotel, setSelectedHotel] = useState('');
  const [hotelError, setHotelError] = useState<string | undefined>();

  const signUp = useSignUp();

  const updateField = (key: keyof SignUpInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleHotelChange = (name: string) => {
    setSelectedHotel(name);
    setHotelError(undefined);
    updateField('companyName', name);
  };

  const handleSignUp = () => {
    if (!token && !selectedHotel) {
      setHotelError('Please select your hotel');
      return;
    }

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
      onSuccess: () => {
        router.replace({
          pathname: '/(onboarding)/employee-code',
          params: { hotelName: selectedHotel },
        });
      },
    });
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
          className="pb-10"
          style={{ paddingTop: insets.top, backgroundColor: '#CE21FB' }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="ml-4 mt-3 h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <View className="mt-2 items-center px-6">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
              <Text className="text-4xl font-bold text-white">IC</Text>
            </View>
            <Text className="text-3xl font-bold text-white">Create Account</Text>
            <Text className="mt-1 text-base text-white/70">
              {token ? 'Complete your invitation' : 'Join IndabaCares'}
            </Text>
          </View>
        </View>

        {/* Form card */}
        <View
          className="flex-1 rounded-t-3xl bg-white px-6"
          style={{ marginTop: -16, paddingBottom: insets.bottom + 24, paddingTop: 32 }}
        >
          <TextInput
            label="Full Name"
            placeholder="Jane Doe"
            value={form.fullName}
            onChangeText={(v) => updateField('fullName', v)}
            error={errors.fullName}
            autoComplete="name"
          />

          <TextInput
            label="Email address"
            placeholder="jane@indabagroup.com"
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
            <HotelPicker
              value={selectedHotel}
              onChange={handleHotelChange}
              error={hotelError}
            />
          )}

          <View className="mt-4">
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={signUp.isPending}
              size="lg"
            />
          </View>

          {signUp.isError && (
            <Text className="mt-3 text-center text-sm text-danger-500">
              {signUp.error.message}
            </Text>
          )}

          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-sm text-slate-500">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm font-bold text-primary-500">Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
