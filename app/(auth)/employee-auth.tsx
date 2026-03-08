import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
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
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Hotel
      </Text>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.inputCard,
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
          open && { borderColor: PRIMARY, borderWidth: 1.5 },
        ]}
        className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-4"
      >
        <Text className={`flex-1 text-base ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'Select your hotel'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? PRIMARY : '#94a3b8'}
        />
      </Pressable>

      {hasError && (
        <Text className="mt-1.5 text-xs font-medium text-red-500">
          Please select your hotel.
        </Text>
      )}

      {open && (
        <View
          style={styles.dropdownCard}
          className="mt-1.5 overflow-hidden rounded-2xl border border-slate-100 bg-white"
        >
          {HOTELS.map((hotel, index) => (
            <Pressable
              key={hotel}
              onPress={() => { onChange(hotel); setOpen(false); }}
              className={`px-4 py-3.5 active:bg-fuchsia-50 ${
                hotel === value ? 'bg-fuchsia-50' : ''
              } ${index < HOTELS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <View className="flex-row items-center">
                {hotel === value && (
                  <Ionicons name="checkmark-circle" size={16} color={PRIMARY} style={{ marginRight: 8 }} />
                )}
                <Text
                  className={`text-base ${
                    hotel === value ? 'font-semibold text-fuchsia-700' : 'text-slate-700'
                  }`}
                >
                  {hotel}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Labelled Input Field ─────────────────────────────────────────────────────

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
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </Text>
      <View
        style={[
          styles.inputCard,
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
        ]}
        className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4"
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c4c4c4"
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secure ? hidden : false}
          className="flex-1 py-4 text-base text-slate-900"
          style={{ paddingRight: secure ? 44 : 0 }}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
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
      {hasError && hint && (
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
    <View className="mb-6 flex-row rounded-2xl bg-slate-100 p-1">
      {(['returning', 'first'] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={active ? [styles.toggleActive] : undefined}
            className={`flex-1 items-center rounded-xl py-3`}
          >
            <Text
              className={`text-sm font-bold tracking-wide ${
                active ? 'text-white' : 'text-slate-400'
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
      style={{ flex: 1, backgroundColor: PRIMARY }}
    >
      {/* ── Hero header ── */}
      <View
        style={{ paddingTop: insets.top + 36, paddingBottom: 40 }}
        className="items-center px-8"
      >
        {/* Logo card */}
        <View style={styles.logoCard} className="mb-5 w-64 items-center rounded-3xl bg-white px-6 py-4">
          <Image
            source={require('../../assets/IndabaCaresLogo.png')}
            style={{ width: '100%', height: 52 }}
            resizeMode="contain"
          />
        </View>

        {/* Wordmark + subheading */}
        <Text className="text-lg font-bold tracking-widest text-white/90">
          INDABA CARES
        </Text>
        <Text className="mt-1 text-sm tracking-wider text-white/60">
          Employee Recognition Platform
        </Text>
      </View>

      {/* ── Form card ── */}
      <View style={styles.formSheet} className="flex-1 rounded-t-3xl bg-white">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 28,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section heading */}
          <Text className="mb-1 text-xl font-bold text-slate-900">
            {mode === 'first' ? 'Create Your Account' : 'Welcome Back'}
          </Text>
          <Text className="mb-6 text-sm text-slate-400">
            {mode === 'first'
              ? 'Verify your identity and set a secure password.'
              : 'Sign in with your employee code and password.'}
          </Text>

          {/* Mode toggle */}
          <ModeToggle mode={mode} onChange={handleModeChange} />

          {/* ── First Auth form ── */}
          {mode === 'first' && (
            <>
              <Field
                label="Full Name"
                value={fullName}
                onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })); setGlobalError(null); }}
                placeholder="As registered by your manager"
                autoCapitalize="words"
                hasError={!!errors.fullName}
                hint={errors.fullName}
              />

              <Field
                label="Employee Code"
                value={employeeCode}
                onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setErrors((e) => ({ ...e, employeeCode: '' })); setGlobalError(null); }}
                placeholder="e.g. IH0042"
                autoCapitalize="characters"
                hasError={!!errors.employeeCode}
                hint={errors.employeeCode}
              />

              <HotelDropdown
                value={hotel}
                onChange={(h) => { setHotel(h); setErrors((e) => ({ ...e, hotel: '' })); setGlobalError(null); }}
                hasError={!!errors.hotel}
              />

              <Field
                label="Password"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); setGlobalError(null); }}
                placeholder="At least 6 characters"
                secure
                hasError={!!errors.password}
                hint={errors.password}
              />

              <Field
                label="Confirm Password"
                value={confirmPw}
                onChangeText={(v) => { setConfirmPw(v); setErrors((e) => ({ ...e, confirmPw: '' })); setGlobalError(null); }}
                placeholder="Re-enter your password"
                secure
                hasError={!!errors.confirmPw}
                hint={errors.confirmPw}
              />
            </>
          )}

          {/* ── Returning Login form ── */}
          {mode === 'returning' && (
            <>
              <Field
                label="Employee Code"
                value={employeeCode}
                onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setErrors((e) => ({ ...e, employeeCode: '' })); setGlobalError(null); }}
                placeholder="e.g. IH0042"
                autoCapitalize="characters"
                hasError={!!errors.employeeCode}
                hint={errors.employeeCode}
              />

              <Field
                label="Password"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); setGlobalError(null); }}
                placeholder="Your password"
                secure
                hasError={!!errors.password}
                hint={errors.password}
              />
            </>
          )}

          {/* ── Primary button ── */}
          <Pressable
            onPress={mode === 'first' ? handleFirstAuth : handleLogin}
            disabled={loading}
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            className="mt-2 items-center justify-center rounded-2xl py-4"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-base font-bold tracking-wide text-white">
                {mode === 'first' ? 'Authenticate & Create Password' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          {/* ── Error display ── */}
          {globalError && (
            <View className="mt-4 flex-row items-center rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text className="ml-2 flex-1 text-sm font-medium text-red-600">
                {globalError}
              </Text>
            </View>
          )}

          {/* ── Mode switch link ── */}
          <Pressable
            onPress={() => handleModeChange(mode === 'first' ? 'returning' : 'first')}
            className="mt-5 items-center py-1"
          >
            <Text className="text-sm text-slate-400">
              {mode === 'first' ? 'Already have a password?  ' : 'First time signing in?  '}
              <Text style={{ color: PRIMARY }} className="font-bold">
                {mode === 'first' ? 'Login' : 'Create account'}
              </Text>
            </Text>
          </Pressable>

          {/* ── Footer brand mark ── */}
          <Text className="mt-8 text-center text-xs tracking-widest text-slate-300">
            INDABA HOSPITALITY GROUP
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  logoCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  formSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  inputCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  toggleActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
});
