import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
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
  { name: 'Indaba Hotel',               emoji: '🏨' },
  { name: 'IndabaLodge Richards Bay',   emoji: '🌊' },
  { name: 'IndabaLodge Gaborone',       emoji: '🌍' },
  { name: 'Chobe Fish Eagle',           emoji: '🦅' },
  { name: 'Nata Lodge',                 emoji: '🌿' },
] as const;

// ─── Hotel picker component ───────────────────────────────────────────────────
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
  const insets = useSafeAreaInsets();

  const selected = HOTELS.find((h) => h.name === value);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">Your Hotel</Text>

      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center rounded-2xl border bg-white px-4 py-3.5 ${
          error ? 'border-danger-500' : 'border-slate-200'
        }`}
      >
        {selected ? (
          <>
            <Text className="mr-2 text-lg">{selected.emoji}</Text>
            <Text className="flex-1 text-base text-slate-900">{selected.name}</Text>
          </>
        ) : (
          <Text className="flex-1 text-base text-slate-400">Select your hotel...</Text>
        )}
        <Ionicons name="chevron-down" size={18} color="#94a3b8" />
      </Pressable>

      {error && <Text className="mt-1 text-xs text-danger-500">{error}</Text>}

      {/* Picker modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
        />
        <View
          className="rounded-t-3xl bg-white"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Handle */}
          <View className="items-center py-3">
            <View className="h-1 w-10 rounded-full bg-slate-200" />
          </View>

          <Text className="mb-2 px-6 text-lg font-bold text-slate-900">
            Select your hotel
          </Text>

          <FlatList
            data={HOTELS}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => {
              const isSelected = item.name === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.name);
                    setOpen(false);
                  }}
                  className={`flex-row items-center px-6 py-4 active:bg-primary-50 ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <Text className="mr-3 text-2xl">{item.emoji}</Text>
                  <Text
                    className={`flex-1 text-base ${
                      isSelected
                        ? 'font-bold text-primary-600'
                        : 'font-medium text-slate-800'
                    }`}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#CE21FB" />
                  )}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View className="mx-6 h-px bg-slate-100" />}
          />
        </View>
      </Modal>
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
    // Validate hotel selection when no invite token
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
        // Route to the employee code screen with the selected hotel as context
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
          className="items-center px-6 pb-10"
          style={{ paddingTop: insets.top + 40, backgroundColor: '#CE21FB' }}
        >
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
            <Text className="text-4xl font-bold text-white">IC</Text>
          </View>
          <Text className="text-3xl font-bold text-white">Create Account</Text>
          <Text className="mt-1 text-base text-white/70">
            {token ? 'Complete your invitation' : 'Join IndabaCares'}
          </Text>
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
