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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEmployee } from '@/providers/EmployeeContext';
import { firstAuthentication, returningLogin } from '@/lib/employee-auth-helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#CE21FB';

const HOTELS = [
  'Indaba Hotel',
  'Indaba Lodge Richards Bay',
  'Indaba Lodge Gaborone',
  'Chobe Safari Lodge',
  'Chobe Bush Lodge',
  'Nata Lodge',
  'African Procurement Agencies',
] as const;

// ─── Hotel Dropdown ───────────────────────────────────────────────────────────

function HotelDropdown({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (h: string) => void;
  hasError: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-slate-600">Hotel</Text>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.inputShadow,
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
          open && { borderColor: PRIMARY, borderWidth: 1.5 },
        ]}
        className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
      >
        <Text
          className={`flex-1 text-base ${value ? 'text-slate-900' : 'text-slate-400'}`}
        >
          {value || 'Select your hotel'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#94a3b8"
        />
      </Pressable>

      {hasError && (
        <Text className="mt-1.5 text-xs font-medium text-red-500">
          Please select your hotel.
        </Text>
      )}

      {open && (
        <View
          style={styles.dropdownShadow}
          className="mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          {HOTELS.map((hotel, index) => (
            <Pressable
              key={hotel}
              onPress={() => {
                onChange(hotel);
                setOpen(false);
              }}
              className={`px-4 py-3.5 active:bg-purple-50 ${
                hotel === value ? 'bg-purple-50' : ''
              } ${index < HOTELS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <Text
                className={`text-base ${
                  hotel === value
                    ? 'font-semibold text-purple-600'
                    : 'text-slate-800'
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

// ─── Labelled Text Input ──────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  autoCorrect = false,
  secure = false,
  hasError = false,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  autoCorrect?: boolean;
  secure?: boolean;
  hasError?: boolean;
  hint?: string;
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-slate-600">{label}</Text>
      <View
        style={[
          styles.inputShadow,
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
        ]}
        className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4"
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secure ? hidden : false}
          className="flex-1 py-4 text-base text-slate-900"
          style={{ paddingRight: secure ? 40 : 0 }}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            className="absolute right-4 top-0 bottom-0 justify-center"
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#94a3b8"
            />
          </Pressable>
        )}
      </View>
      {hint && !hasError && (
        <Text className="mt-1.5 text-xs text-slate-400">{hint}</Text>
      )}
      {hasError && (
        <Text className="mt-1.5 text-xs font-medium text-red-500">{hint}</Text>
      )}
    </View>
  );
}

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

type Mode = 'first' | 'returning';

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <View className="mb-8 flex-row rounded-2xl bg-slate-100 p-1">
      {(['returning', 'first'] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={active ? { backgroundColor: PRIMARY } : undefined}
            className={`flex-1 items-center rounded-xl py-2.5 ${
              active ? '' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-white' : 'text-slate-500'
              }`}
            >
              {m === 'returning' ? 'Login' : 'First Time'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EmployeeAuthScreen() {
  const insets = useSafeAreaInsets();
  const { setEmployee } = useEmployee();

  const [mode, setMode] = useState<Mode>('returning');

  // ── Shared fields ────────────────────────────────────────────────────────
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');

  // ── First-auth-only fields ────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [hotel, setHotel] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Validation error flags ────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Reset state when switching mode ──────────────────────────────────────
  const handleModeChange = (m: Mode) => {
    setMode(m);
    setErrors({});
    setGlobalError(null);
    setPassword('');
    setConfirmPw('');
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (mode === 'first') {
      if (!fullName.trim())
        next.fullName = 'Full name is required.';
      if (!employeeCode.trim())
        next.employeeCode = 'Employee code is required.';
      if (!hotel)
        next.hotel = 'Please select your hotel.';
      if (!password)
        next.password = 'Password is required.';
      if (password && password.length < 6)
        next.password = 'Password must be at least 6 characters.';
      if (!confirmPw)
        next.confirmPw = 'Please confirm your password.';
      if (password && confirmPw && password !== confirmPw)
        next.confirmPw = 'Passwords do not match.';
    } else {
      // Returning login — hotel NOT required (stored in session from first auth)
      if (!employeeCode.trim())
        next.employeeCode = 'Employee code is required.';
      if (!password)
        next.password = 'Password is required.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit: First Authentication ──────────────────────────────────────────
  const handleFirstAuth = async () => {
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);

    try {
      const result = await firstAuthentication(fullName, employeeCode, hotel, password);

      if (!result.ok) {
        setGlobalError(result.error);
        return;
      }

      await setEmployee({
        employee_id:   result.employee_id,
        full_name:     result.full_name,
        employee_code: result.employee_code,
        hotel:         result.hotel,
      });
    } catch {
      setGlobalError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit: Returning Login ───────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);

    try {
      const result = await returningLogin(employeeCode, password);

      if (!result.ok) {
        setGlobalError(result.error);
        return;
      }

      await setEmployee({
        employee_id:   result.employee_id,
        full_name:     result.full_name,
        employee_code: result.employee_code,
        hotel:         result.hotel,
      });
    } catch {
      setGlobalError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="mb-8 items-center">
          <View
            style={{ backgroundColor: PRIMARY }}
            className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
          >
            <Ionicons name="shield-checkmark-outline" size={28} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-slate-900">
            {mode === 'first' ? 'Create Your Account' : 'Welcome Back'}
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-500">
            {mode === 'first'
              ? 'Verify your identity and set a password.'
              : 'Sign in with your employee code and password.'}
          </Text>
        </View>

        {/* ── Mode toggle ── */}
        <ModeToggle mode={mode} onChange={handleModeChange} />

        {/* ── First Auth form ── */}
        {mode === 'first' && (
          <>
            <Field
              label="Full Name"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                setErrors((e) => ({ ...e, fullName: '' }));
                setGlobalError(null);
              }}
              placeholder="As registered by your manager"
              autoCapitalize="words"
              autoCorrect={false}
              hasError={!!errors.fullName}
              hint={errors.fullName}
            />

            <Field
              label="Employee Code"
              value={employeeCode}
              onChangeText={(v) => {
                setEmployeeCode(v.toUpperCase());
                setErrors((e) => ({ ...e, employeeCode: '' }));
                setGlobalError(null);
              }}
              placeholder="e.g. IH0042"
              autoCapitalize="characters"
              hasError={!!errors.employeeCode}
              hint={errors.employeeCode}
            />

            <HotelDropdown
              value={hotel}
              onChange={(h) => {
                setHotel(h);
                setErrors((e) => ({ ...e, hotel: '' }));
                setGlobalError(null);
              }}
              hasError={!!errors.hotel}
            />

            <Field
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrors((e) => ({ ...e, password: '' }));
                setGlobalError(null);
              }}
              placeholder="At least 6 characters"
              secure
              hasError={!!errors.password}
              hint={errors.password}
            />

            <Field
              label="Confirm Password"
              value={confirmPw}
              onChangeText={(v) => {
                setConfirmPw(v);
                setErrors((e) => ({ ...e, confirmPw: '' }));
                setGlobalError(null);
              }}
              placeholder="Re-enter your password"
              secure
              hasError={!!errors.confirmPw}
              hint={errors.confirmPw}
            />
          </>
        )}

        {/* ── Returning Login form — employee code + password only ── */}
        {mode === 'returning' && (
          <>
            <Field
              label="Employee Code"
              value={employeeCode}
              onChangeText={(v) => {
                setEmployeeCode(v.toUpperCase());
                setErrors((e) => ({ ...e, employeeCode: '' }));
                setGlobalError(null);
              }}
              placeholder="e.g. IH0042"
              autoCapitalize="characters"
              hasError={!!errors.employeeCode}
              hint={errors.employeeCode}
            />

            <Field
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setErrors((e) => ({ ...e, password: '' }));
                setGlobalError(null);
              }}
              placeholder="Your password"
              secure
              hasError={!!errors.password}
              hint={errors.password}
            />
          </>
        )}

        {/* ── Global error ── */}
        {globalError && (
          <View className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-center text-sm font-medium text-red-600">
              {globalError}
            </Text>
          </View>
        )}

        {/* ── Primary button ── */}
        <Pressable
          onPress={mode === 'first' ? handleFirstAuth : handleLogin}
          disabled={loading}
          style={[styles.buttonShadow, { backgroundColor: PRIMARY, opacity: loading ? 0.7 : 1 }]}
          className="mt-2 items-center justify-center rounded-2xl py-4"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-base font-bold tracking-wide text-white">
              {mode === 'first' ? 'Authenticate & Create Password' : 'Login'}
            </Text>
          )}
        </Pressable>

        {/* ── Mode hint ── */}
        <Pressable
          onPress={() => handleModeChange(mode === 'first' ? 'returning' : 'first')}
          className="mt-5 items-center py-1"
        >
          <Text className="text-sm text-slate-400">
            {mode === 'first'
              ? 'Already have a password? '
              : 'First time signing in? '}
            <Text style={{ color: PRIMARY }} className="font-semibold">
              {mode === 'first' ? 'Login' : 'Create account'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  inputShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonShadow: {
    shadowColor: '#CE21FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
