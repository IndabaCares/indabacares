import React, { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Avatar } from '@/components/ui/Avatar';
import { useSearchProfiles } from '@/hooks/use-profiles';
import { useAuthStore } from '@/stores/auth-store';
import { MAX_RECIPIENTS } from '@/lib/constants';

interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

interface RecipientPickerProps {
  selected: Profile[];
  onSelect: (profile: Profile) => void;
  onRemove: (id: string) => void;
}

export function RecipientPicker({ selected, onSelect, onRemove }: RecipientPickerProps) {
  const [search, setSearch] = useState('');
  const userId = useAuthStore((s) => s.user?.id);
  const { data: results = [], isLoading } = useSearchProfiles(search);

  const filtered = (results as Profile[]).filter(
    (p: Profile) => p.id !== userId && !selected.some((s) => s.id === p.id)
  );

  return (
    <View>
      {/* Selected chips */}
      {selected.length > 0 && (
        <View className="mb-2 flex-row flex-wrap">
          {selected.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onRemove(p.id)}
              className="mb-2 mr-2 flex-row items-center rounded-full bg-primary-50 px-3 py-1.5"
            >
              <Avatar uri={p.avatar_url} name={p.full_name} size="xs" />
              <Text className="ml-1.5 text-sm font-medium text-primary-700">
                {p.display_name || p.full_name}
              </Text>
              <Text className="ml-1.5 text-xs text-primary-400">✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {selected.length < MAX_RECIPIENTS && (
        <>
          <TextInput
            placeholder="Search colleagues..."
            value={search}
            onChangeText={setSearch}
          />

          {search.length >= 2 && (
            <View className="max-h-48 rounded-xl border border-slate-100 bg-white">
              {isLoading ? (
                <Text className="p-4 text-center text-sm text-slate-400">Searching...</Text>
              ) : filtered.length === 0 ? (
                <Text className="p-4 text-center text-sm text-slate-400">No results</Text>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        onSelect(item);
                        setSearch('');
                      }}
                      className="flex-row items-center px-4 py-3 active:bg-slate-50"
                    >
                      <Avatar uri={item.avatar_url} name={item.full_name} size="sm" />
                      <View className="ml-3">
                        <Text className="text-sm font-medium text-slate-800">
                          {item.display_name || item.full_name}
                        </Text>
                        {item.job_title && (
                          <Text className="text-xs text-slate-400">{item.job_title}</Text>
                        )}
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}
