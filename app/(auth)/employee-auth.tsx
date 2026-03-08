import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useEmployee } from '@/providers/EmployeeContext';
import { ALLOWED_HOTELS } from '@/api/employee-auth';

// ─── Inline hotel dropdown ────────────────────────────────────────────────────

function HotelPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (h: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">Hotel</Text>

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

      {open && (
        <View className="mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {ALLOWED_HOTELS.map((hotel, index) => (
            <Pressable
              key={hotel}
              onPress={() => { onChange(hotel); setOpen(false); }}
              className={`px-4 py-3.5 active:bg-primary-50 ${
                hotel === value ? 'bg-primary-50' : 'bg-white'
              } ${index < ALLOWED_HOTELS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <Text className={`text-base ${
                hotel === value ? 'font-semibold text-primary-600' : 'text-slate-800'
              }`}>
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

export default function EmployeeAuthScreen() {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const { setEmployee } = useEmployee();

  const [fullName,      setFullName]      = useState('');
  const [employeeCode,  setEmployeeCode]  = useState('');
  const [hotel,         setHotel]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [hotelError,    setHotelError]    = useState<string | undefined>();

  const handleAuthenticate = async () => {
    setError(null);
    setHotelError(undefined);

    // Basic field validation
    if (!fullName.trim() || !employeeCode.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!hotel) {
      setHotelError('Please select your hotel.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_code', employeeCode.trim().toUpperCase())
        .eq('full_name',     fullName.trim())
        .eq('hotel',         hotel)
        .eq('status',        'active')
        .single();

      if (dbError || !data) {
        setError('Employee not recognised.');
        return;
      }

      // Store authenticated employee in context + AsyncStorage
      await setEmployee({
        employee_id:   data.id,
        full_name:     data.full_name,
        employee_code: data.employee_code,
        hotel:         data.hotel,
      });

      // Navigate to HomeScreen
      router.replace('/(tabs)');
    } catch {
      setError('Employee not recognised.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        className="px-8"
      >
        {/* Title — preserved from placeholder */}
        <View className="mb-8 mt-16 items-center">
          <Text className="text-2xl font-bold text-slate-900">
            Employee Authentication
          </Text>
          <Text className="mt-3 text-center text-base text-slate-500">
            Enter your details to access IndabaCares.
          </Text>
        </View>

        {/* Form */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-slate-700">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={(v) => { setFullName(v); setError(null); }}
            placeholder="As registered by your manager"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            autoCorrect={false}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900"
          />
        </View>

        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-slate-700">Employee Code</Text>
          <TextInput
            value={employeeCode}
            onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setError(null); }}
            placeholder="e.g. INDABA01"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            autoCorrect={false}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900"
          />
        </View>

        <HotelPicker
          value={hotel}
          onChange={(h) => { setHotel(h); setHotelError(undefined); setError(null); }}
          error={hotelError}
        />

        {/* Error message */}
        {error && (
          <Text className="mb-4 text-center text-sm font-medium text-danger-500">
            {error}
          </Text>
        )}

        {/* Authenticate button */}
        <Pressable
          onPress={handleAuthenticate}
          disabled={loading}
          className={`items-center justify-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">Authenticate</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
