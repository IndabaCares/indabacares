import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEmployee } from '@/providers/EmployeeContext';
import { firstAuthentication, returningLogin } from '@/lib/employee-auth-helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPLE      = '#6A1B9A';
const PURPLE_DARK = '#4A148C';
const PURPLE_MID  = '#8E24AA';
const ACCENT      = '#CE21FB';

const LAST_HOTEL_KEY = '@indabacares/last_hotel';

const HOTELS = [
  'Indaba Hotel',
  'Indaba Lodge Richards Bay',
  'Indaba Lodge Gaborone',
  'Chobe Safari Lodge',
  'Chobe Bush Lodge',
  'Nata Lodge',
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
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.inputField,
          { flexDirection: 'row', alignItems: 'center' },
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
          open && { borderColor: ACCENT, borderWidth: 1.5 },
        ]}
      >
        <Text
          style={[
            styles.inputText,
            { flex: 1 },
            !value && { color: '#9e9e9e' },
          ]}
        >
          {value || 'Select your hotel'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? ACCENT : '#9e9e9e'}
        />
      </Pressable>

      {hasError && (
        <Text style={styles.errorText}>Please select your hotel.</Text>
      )}

      {open && (
        <View style={styles.dropdownCard}>
          {HOTELS.map((hotel, index) => (
            <Pressable
              key={hotel}
              onPress={() => { onChange(hotel); setOpen(false); }}
              style={[
                styles.dropdownItem,
                hotel === value && { backgroundColor: '#F3E5F5' },
                index < HOTELS.length - 1 && styles.dropdownDivider,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {hotel === value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={PURPLE}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={[
                    styles.dropdownItemText,
                    hotel === value && { fontWeight: '700', color: PURPLE },
                  ]}
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

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  autoCorrect = false,
  secure = false,
  hasError = false,
  hint,
}: {
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
    <View style={{ marginBottom: 12 }}>
      <View
        style={[
          styles.inputField,
          { flexDirection: 'row', alignItems: 'center' },
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9e9e9e"
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secure ? hidden : false}
          style={[styles.inputText, { flex: 1, paddingRight: secure ? 36 : 0 }]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#9e9e9e"
            />
          </Pressable>
        )}
      </View>
      {hasError && hint && (
        <Text style={styles.errorText}>{hint}</Text>
      )}
    </View>
  );
}

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

type Mode = 'first' | 'returning';

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.toggleContainer}>
      {(['returning', 'first'] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={[styles.toggleTab, active && styles.toggleTabActive]}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {m === 'returning' ? 'Login' : 'Register'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EmployeeAuthScreen() {
  const { setEmployee } = useEmployee();

  const [mode, setMode] = useState<Mode>('returning');

  // ── Shared fields ─────────────────────────────────────────────────────────
  const [employeeCode, setEmployeeCode] = useState('');
  const [password,     setPassword]     = useState('');

  // ── First-auth-only fields ────────────────────────────────────────────────
  const [fullName,  setFullName]  = useState('');
  const [hotel,     setHotel]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Saved hotel (returning login) ─────────────────────────────────────────
  const [savedHotel,      setSavedHotel]      = useState<string | null>(null);
  const [showHotelPicker, setShowHotelPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_HOTEL_KEY)
      .then((h) => { if (h) setSavedHotel(h); })
      .catch(() => null);
  }, []);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [loading,     setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Reset on mode switch ──────────────────────────────────────────────────
  const handleModeChange = (m: Mode) => {
    setMode(m);
    setErrors({});
    setGlobalError(null);
    setPassword('');
    setConfirmPw('');
    setShowHotelPicker(false);
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
      if (password && password.length < 8)
        next.password = 'Password must be at least 8 characters.';
      if (!confirmPw)
        next.confirmPw = 'Please confirm your password.';
      if (password && confirmPw && password !== confirmPw)
        next.confirmPw = 'Passwords do not match.';
    } else {
      if (!employeeCode.trim())
        next.employeeCode = 'Employee code is required.';
      if (!password)
        next.password = 'Password is required.';
      if (!savedHotel && !hotel)
        next.hotel = 'Please select your hotel.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Persist hotel preference on success ──────────────────────────────────
  const persistHotel = (h: string) =>
    AsyncStorage.setItem(LAST_HOTEL_KEY, h).catch(() => null);

  // ── First Authentication ──────────────────────────────────────────────────
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

      await persistHotel(result.hotel);
      setSavedHotel(result.hotel);

      await setEmployee({
        employee_id:   result.employee_id,
        full_name:     result.full_name,
        employee_code: result.employee_code,
        hotel:         result.hotel,
        department:    result.department,
        session_token: result.token,
      });
    } catch {
      setGlobalError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Returning Login ───────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);

    const hotelToUse = savedHotel ?? hotel;

    try {
      const result = await returningLogin(employeeCode, hotelToUse, password);

      if (!result.ok) {
        setGlobalError(result.error);
        return;
      }

      await persistHotel(result.hotel);
      setSavedHotel(result.hotel);

      await setEmployee({
        employee_id:   result.employee_id,
        full_name:     result.full_name,
        employee_code: result.employee_code,
        hotel:         result.hotel,
        department:    result.department,
        session_token: result.token,
      });
    } catch {
      setGlobalError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F2' }}>

      {/* ── Scrollable content ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Login card ── */}
          <View style={styles.card}>

            {/* Card header text */}
            <Text style={styles.cardTitle}>
              {mode === 'first' ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'first'
                ? 'Verify your identity and set a secure password.'
                : 'Fill out the information below in order to access your profile'}
            </Text>

            {/* Mode toggle */}
            <ModeToggle mode={mode} onChange={handleModeChange} />

            {/* ── First Authentication form ── */}
            {mode === 'first' && (
              <>
                <Field
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })); setGlobalError(null); }}
                  placeholder="Full name as registered"
                  autoCapitalize="words"
                  hasError={!!errors.fullName}
                  hint={errors.fullName}
                />

                <Field
                  value={employeeCode}
                  onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setErrors((e) => ({ ...e, employeeCode: '' })); setGlobalError(null); }}
                  placeholder="insert employee code..."
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
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); setGlobalError(null); }}
                  placeholder="insert password..."
                  secure
                  hasError={!!errors.password}
                  hint={errors.password}
                />

                <Field
                  value={confirmPw}
                  onChangeText={(v) => { setConfirmPw(v); setErrors((e) => ({ ...e, confirmPw: '' })); setGlobalError(null); }}
                  placeholder="Confirm password"
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
                  value={employeeCode}
                  onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setErrors((e) => ({ ...e, employeeCode: '' })); setGlobalError(null); }}
                  placeholder="insert employee code..."
                  autoCapitalize="characters"
                  hasError={!!errors.employeeCode}
                  hint={errors.employeeCode}
                />

                <Field
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); setGlobalError(null); }}
                  placeholder="insert password..."
                  secure
                  hasError={!!errors.password}
                  hint={errors.password}
                />

                {savedHotel && !showHotelPicker ? (
                  <View style={styles.savedHotelRow}>
                    <Ionicons name="location-outline" size={14} color="#CE93D8" />
                    <Text style={styles.savedHotelText}>
                      Signing in at{' '}
                      <Text style={styles.savedHotelName}>{savedHotel}</Text>
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowHotelPicker(true);
                        setSavedHotel(null);
                        setHotel('');
                      }}
                      hitSlop={10}
                    >
                      <Text style={styles.changeHotelLink}>Change</Text>
                    </Pressable>
                  </View>
                ) : (
                  <HotelDropdown
                    value={hotel}
                    onChange={(h) => { setHotel(h); setErrors((e) => ({ ...e, hotel: '' })); setGlobalError(null); }}
                    hasError={!!errors.hotel}
                  />
                )}
              </>
            )}

            {/* ── Primary button ── */}
            <Pressable
              onPress={mode === 'first' ? handleFirstAuth : handleLogin}
              disabled={loading}
              style={[styles.signInButton, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color={PURPLE} size="small" />
              ) : (
                <Text style={styles.signInButtonText}>
                  {mode === 'first' ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </Pressable>

            {/* ── Global error ── */}
            {globalError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.errorBannerText}>{globalError}</Text>
              </View>
            )}

            {/* ── Forgot Password / mode switch ── */}
            <Pressable
              onPress={() => handleModeChange(mode === 'first' ? 'returning' : 'first')}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={styles.forgotText}>
                {mode === 'first' ? 'Already have a password?' : 'Forgot Password?'}
              </Text>
            </Pressable>

          </View>

          <Text style={styles.footerText}>INDABA HOSPITALITY GROUP</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Scroll
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },

  // Card
  card: {
    width: '85%',
    maxWidth: 420,
    backgroundColor: PURPLE,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#EDE7F6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Mode toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  toggleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toggleTextActive: {
    color: PURPLE,
  },

  // Input field
  inputField: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 0,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputText: {
    fontSize: 15,
    color: '#212121',
    paddingVertical: Platform.OS === 'android' ? 14 : 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#ffcdd2',
  },

  // Dropdown
  dropdownCard: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#424242',
  },

  // Saved hotel row
  savedHotelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savedHotelText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#CE93D8',
  },
  savedHotelName: {
    fontWeight: '600',
    color: '#ffffff',
  },
  changeHotelLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EDE7F6',
  },

  // Sign In button
  signInButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonText: {
    color: PURPLE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  errorBannerText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
    color: '#ffcdd2',
    fontWeight: '500',
  },

  // Forgot password
  forgotText: {
    color: '#EDE7F6',
    fontSize: 14,
    textAlign: 'center',
  },

  // Footer
  footerText: {
    marginTop: 24,
    fontSize: 11,
    letterSpacing: 2,
    color: '#bdbdbd',
    textAlign: 'center',
  },
});
