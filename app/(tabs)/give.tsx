import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { usePostRecognition } from '@/hooks/use-post-recognition';
import { searchEmployeesQuery } from '@/api/queries';
import { RECOGNITION_BADGES, QUERY_KEYS } from '@/lib/constants';
import { useEmployee } from '@/providers/EmployeeContext';
import type { RecognitionBadge } from '@/lib/constants';

interface EmployeeResult {
  id: string;
  full_name: string;
  employee_code: string;
  position: string | null;
  department: string | null;
}

// ─── Employee Search ──────────────────────────────────────────────────────────

function EmployeeSearch({
  hotel,
  selected,
  onSelect,
  onClear,
}: {
  hotel: string;
  selected: EmployeeResult | null;
  onSelect: (e: EmployeeResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const { data: results = [], isFetching } = useQuery({
    queryKey: QUERY_KEYS.employees(query),
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await searchEmployeesQuery(hotel, query);
      if (error) throw error;
      return (data ?? []) as EmployeeResult[];
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });

  if (selected) {
    return (
      <View className="flex-row items-center rounded-xl border border-primary-200 bg-primary-50 px-3 py-3">
        <Avatar name={selected.full_name} size="sm" />
        <View className="ml-2.5 flex-1">
          <Text className="text-sm font-semibold text-slate-800">{selected.full_name}</Text>
          {selected.position && (
            <Text className="text-xs text-slate-400">{selected.position}</Text>
          )}
        </View>
        <Pressable onPress={onClear} className="p-1">
          <Ionicons name="close-circle" size={20} color="#7c3aed" />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-3">
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search by name…"
          placeholderTextColor="#94a3b8"
          className="ml-2 flex-1 text-sm text-slate-800"
          autoCorrect={false}
        />
        {isFetching && <ActivityIndicator size="small" color="#7c3aed" />}
      </View>

      {focused && results.length > 0 && (
        <View className="mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-md">
          {results.slice(0, 6).map((emp) => (
            <Pressable
              key={emp.id}
              onPress={() => {
                onSelect(emp);
                setQuery('');
              }}
              className="flex-row items-center px-3 py-2.5 active:bg-slate-50"
            >
              <Avatar name={emp.full_name} size="sm" />
              <View className="ml-2.5 flex-1">
                <Text className="text-sm font-semibold text-slate-800">{emp.full_name}</Text>
                <Text className="text-xs text-slate-400">
                  {[emp.position, emp.department].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Badge Selector ───────────────────────────────────────────────────────────

function BadgeSelector({
  selected,
  onSelect,
}: {
  selected: RecognitionBadge | null;
  onSelect: (b: RecognitionBadge) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {RECOGNITION_BADGES.map((b) => {
        const active = selected === b.value;
        return (
          <Pressable
            key={b.value}
            onPress={() => onSelect(b.value)}
            className="flex-row items-center rounded-full px-3.5 py-2 active:opacity-70"
            style={{
              backgroundColor: active ? b.color : b.color + '15',
              borderWidth: 1.5,
              borderColor: active ? b.color : b.color + '40',
            }}
          >
            <Text className="text-sm">{b.emoji}</Text>
            <Text
              className="ml-1.5 text-xs font-semibold"
              style={{ color: active ? '#fff' : b.color }}
            >
              {b.value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GiveScreen() {
  const insets = useSafeAreaInsets();
  const { employee } = useEmployee();
  const postRecognition = usePostRecognition();

  const [receiver, setReceiver] = useState<EmployeeResult | null>(null);
  const [badge, setBadge] = useState<RecognitionBadge | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSend = useCallback(() => {
    setError('');

    if (!receiver) { setError('Please select a colleague to recognize.'); return; }
    if (!badge)    { setError('Please select a recognition badge.'); return; }
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }

    postRecognition.mutate(
      { receiverId: receiver.id, message: message.trim(), badge },
      {
        onSuccess: () => {
          setReceiver(null);
          setBadge(null);
          setMessage('');
          router.push('/(tabs)');
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  }, [receiver, badge, message, postRecognition]);

  if (!employee) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text className="mb-1 text-2xl font-bold text-violet-900">Recognize a Colleague</Text>
        <Text className="mb-6 text-sm text-violet-400">
          Celebrate someone who made a difference at {employee.hotel}.
        </Text>

        {/* Step 1: Recipient */}
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-400">
          Who are you recognizing?
        </Text>
        <EmployeeSearch
          hotel={employee.hotel}
          selected={receiver}
          onSelect={setReceiver}
          onClear={() => setReceiver(null)}
        />

        {/* Step 2: Badge */}
        <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-violet-400">
          Choose a badge
        </Text>
        <BadgeSelector selected={badge} onSelect={setBadge} />

        {/* Step 3: Message */}
        <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-violet-400">
          Your message
        </Text>
        <View className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <TextInput
            value={message}
            onChangeText={(v) => { setMessage(v); setError(''); }}
            placeholder="Share what they did and why it matters…"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
            className="text-base leading-6 text-slate-800"
            style={{ minHeight: 110 }}
          />
        </View>
        <Text className="mt-1 text-right text-xs text-slate-400">
          {message.length}/500
        </Text>

        {/* Error */}
        {!!error && (
          <View className="mt-3 flex-row items-center rounded-xl bg-red-50 px-4 py-3">
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text className="ml-2 flex-1 text-sm text-red-600">{error}</Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSend}
          disabled={postRecognition.isPending}
          className="mt-5 items-center justify-center rounded-2xl py-4 active:opacity-80"
          style={{
            backgroundColor: '#7C3AED',
            shadowColor: '#7c3aed',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {postRecognition.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text className="ml-2 text-base font-bold text-white">Send Recognition</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
