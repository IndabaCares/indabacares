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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEmployee } from '@/providers/EmployeeContext';
import { firstAuthentication } from '@/lib/employee-auth-helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPLE = '#6A1B9A';

const LAST_HOTEL_KEY = '@indabacares/last_hotel';

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
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.inputField,
          { flexDirection: 'row', alignItems: 'center' },
          hasError && { borderColor: '#ef4444', borderWidth: 1.5 },
          open && { borderColor: '#CE21FB', borderWidth: 1.5 },
        ]}
      >
        <Text
          style={[
            styles.inputText,
            { flex: 1 },
            !value && { color: '#9e9e9e' },
          ]}
        >
          {value || 'Select...'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? '#CE21FB' : '#9e9e9e'}
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
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  autoCorrect?: boolean;
  secure?: boolean;
  hasError?: boolean;
  hint?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
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
          keyboardType={keyboardType}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateUserScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { setEmployee } = useEmployee();

  // ── Form fields ───────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password,     setPassword]     = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [hotel,        setHotel]        = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [loading,     setLoading]     = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: Record<string, string> = {};

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

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── First Authentication ──────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!validate()) return;
    setGlobalError(null);
    setLoading(true);

    try {
      const result = await firstAuthentication(fullName, employeeCode, hotel, password);

      if (!result.ok) {
        setGlobalError(result.error);
        return;
      }

      await AsyncStorage.setItem(LAST_HOTEL_KEY, result.hotel).catch(() => null);

      await setEmployee({
        employee_id:   result.employee_id,
        full_name:     result.full_name,
        employee_code: result.employee_code,
        hotel:         result.hotel,
        department:    result.department,
        position:      null,
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

      {/* ── Header bar ── */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSide}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.headerSide} />
        </View>
      </View>

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

          {/* ── Card ── */}
          <View style={styles.card}>

            {/* Card title */}
            <Text style={styles.cardTitle}>Get Started</Text>
            <Text style={styles.cardSubtitle}>
              Lets get started by filling out the form below
            </Text>

            {/* Full Name */}
            <Field
              value={fullName}
              onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })); setGlobalError(null); }}
              placeholder="Full Name..."
              autoCapitalize="words"
              hasError={!!errors.fullName}
              hint={errors.fullName}
            />

            {/* Employee Number */}
            <Field
              value={employeeCode}
              onChangeText={(v) => { setEmployeeCode(v.toUpperCase()); setErrors((e) => ({ ...e, employeeCode: '' })); setGlobalError(null); }}
              placeholder="Employee Number..."
              autoCapitalize="characters"
              hasError={!!errors.employeeCode}
              hint={errors.employeeCode}
            />

            {/* Password */}
            <Field
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); setGlobalError(null); }}
              placeholder="Password..."
              secure
              hasError={!!errors.password}
              hint={errors.password}
            />

            {/* Confirm Password */}
            <Field
              value={confirmPw}
              onChangeText={(v) => { setConfirmPw(v); setErrors((e) => ({ ...e, confirmPw: '' })); setGlobalError(null); }}
              placeholder="Confirm Password..."
              secure
              hasError={!!errors.confirmPw}
              hint={errors.confirmPw}
            />

            {/* Hotel Dropdown */}
            <HotelDropdown
              value={hotel}
              onChange={(h) => { setHotel(h); setErrors((e) => ({ ...e, hotel: '' })); setGlobalError(null); }}
              hasError={!!errors.hotel}
            />

            {/* Global error */}
            {globalError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.errorBannerText}>{globalError}</Text>
              </View>
            )}

            {/* Create Account button */}
            <Pressable
              onPress={handleCreateAccount}
              disabled={loading}
              style={[styles.createButton, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color={PURPLE} size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="person-add-outline" size={18} color={PURPLE} />
                  <Text style={styles.createButtonText}>Create Account</Text>
                </View>
              )}
            </Pressable>

            {/* Login redirect */}
            <Pressable
              onPress={() => router.replace('/(auth)/employee-auth')}
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text style={styles.loginRedirectText}>
                Already have an Account?{' '}
                <Text style={styles.loginRedirectLink}>Login here!</Text>
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
  // Header
  header: {
    backgroundColor: PURPLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSide: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

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

  // Input
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

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
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

  // Create Account button
  createButton: {
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
  createButtonText: {
    color: PURPLE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Login redirect
  loginRedirectText: {
    color: '#EDE7F6',
    fontSize: 14,
    textAlign: 'center',
  },
  loginRedirectLink: {
    color: '#CE93D8',
    fontWeight: '700',
    textDecorationLine: 'underline',
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
