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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import {
  ALLOWED_HOTELS,
  verifyEmployeeIdentity,
  setEmployeePassword,
  loginEmployee,
} from '@/api/employee-auth';

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

// ─── Password input with eye toggle ──────────────────────────────────────────

function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '••••••••'}
          placeholderTextColor="#94a3b8"
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-base text-slate-900"
        />
        <Pressable
          onPress={() => setHidden((h) => !h)}
          className="absolute bottom-0 right-0 top-0 w-12 items-center justify-center"
          hitSlop={4}
        >
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="#94a3b8"
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Phase =
  | 'identity'       // Step 1: full_name + code + hotel
  | 'set_password'   // First login: create a password
  | 'login';         // Returning: enter existing password

export default function EmployeeAuthScreen() {
  const insets          = useSafeAreaInsets();
  const { setEmployee } = useEmployee();

  // ── Phase 1 fields ───────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [hotel,        setHotel]        = useState('');
  const [hotelError,   setHotelError]   = useState<string | undefined>();

  // ── Password fields ──────────────────────────────────────────────────────
  const [password,    setPassword]    = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [phase,   setPhase]   = useState<Phase>('identity');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Stored after a successful identity check
  const [verifiedId,        setVerifiedId]        = useState('');
  const [verifiedFullName,  setVerifiedFullName]  = useState('');
  const [verifiedHotel,     setVerifiedHotel]     = useState('');

  // ── Phase 1: verify identity ─────────────────────────────────────────────
  const handleVerifyIdentity = async () => {
    setError(null);
    setHotelError(undefined);

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
      const result = await verifyEmployeeIdentity(fullName, employeeCode, hotel);

      if (!result.found) {
        setError(result.error ?? 'Employee not recognised. Check your name, code, and hotel.');
        return;
      }

      setVerifiedId(result.id);
      setVerifiedFullName(result.full_name);
      setVerifiedHotel(result.hotel);
      setPhase(result.needs_password ? 'set_password' : 'login');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phase 2a: set password (first login) ─────────────────────────────────
  const handleSetPassword = async () => {
    setError(null);

    if (!password) {
      setError('Please choose a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await setEmployeePassword(verifiedId, password);

      if (!result.success) {
        setError(result.error ?? 'Could not set password. Please try again.');
        return;
      }

      // Password saved — log the employee in
      await setEmployee({
        employee_id:   verifiedId,
        full_name:     verifiedFullName,
        employee_code: employeeCode.trim().toUpperCase(),
        hotel:         verifiedHotel,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phase 2b: returning login ─────────────────────────────────────────────
  const handleLogin = async () => {
    setError(null);

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginEmployee(employeeCode, verifiedHotel, password);

      if (!result.found) {
        setError(result.error ?? 'Invalid employee code or password.');
        return;
      }

      await setEmployee({
        employee_id:   result.id,
        full_name:     result.full_name,
        employee_code: employeeCode.trim().toUpperCase(),
        hotel:         result.hotel,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
        {/* Header */}
        <View className="mb-8 mt-16 items-center">
          <Text className="text-2xl font-bold text-slate-900">
            {phase === 'identity'
              ? 'Employee Authentication'
              : phase === 'set_password'
              ? 'Create Your Password'
              : 'Welcome Back'}
          </Text>
          <Text className="mt-3 text-center text-base text-slate-500">
            {phase === 'identity'
              ? 'Enter your details to access IndabaCares.'
              : phase === 'set_password'
              ? `Hi ${verifiedFullName}! Set a password for your account.`
              : `Hi ${verifiedFullName}! Enter your password to continue.`}
          </Text>
        </View>

        {/* ── Phase 1: Identity ── */}
        {phase === 'identity' && (
          <>
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
          </>
        )}

        {/* ── Phase 2a: Set password (first login) ── */}
        {phase === 'set_password' && (
          <>
            <PasswordInput
              label="New Password"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              placeholder="At least 6 characters"
            />
            <PasswordInput
              label="Confirm Password"
              value={confirmPw}
              onChangeText={(v) => { setConfirmPw(v); setError(null); }}
            />
          </>
        )}

        {/* ── Phase 2b: Returning login ── */}
        {phase === 'login' && (
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
          />
        )}

        {/* Error */}
        {error && (
          <Text className="mb-4 text-center text-sm font-medium text-danger-500">
            {error}
          </Text>
        )}

        {/* Primary action button */}
        <Pressable
          onPress={
            phase === 'identity'
              ? handleVerifyIdentity
              : phase === 'set_password'
              ? handleSetPassword
              : handleLogin
          }
          disabled={loading}
          className={`items-center justify-center rounded-2xl bg-primary-500 py-4 active:bg-primary-600 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {phase === 'identity'
                ? 'Continue'
                : phase === 'set_password'
                ? 'Set Password & Sign In'
                : 'Sign In'}
            </Text>
          )}
        </Pressable>

        {/* Back link for password phases */}
        {phase !== 'identity' && (
          <Pressable
            onPress={() => {
              setPhase('identity');
              setPassword('');
              setConfirmPw('');
              setError(null);
            }}
            className="mt-4 items-center py-2"
          >
            <Text className="text-sm text-slate-400">Use different details</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
