import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { MAX_HASHTAGS } from '@/lib/constants';

interface HashtagInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
}

export function HashtagInput({ hashtags, onChange }: HashtagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (tag && !hashtags.includes(tag) && hashtags.length < MAX_HASHTAGS) {
      onChange([...hashtags, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(hashtags.filter((t) => t !== tag));
  };

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row flex-wrap">
        {hashtags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => removeTag(tag)}
            className="mb-1 mr-2 flex-row items-center rounded-full bg-primary-50 px-3 py-1"
          >
            <Text className="text-sm text-primary-600">#{tag}</Text>
            <Text className="ml-1 text-xs text-primary-400">✕</Text>
          </Pressable>
        ))}
      </View>

      {hashtags.length < MAX_HASHTAGS && (
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTag}
          placeholder="Add hashtag..."
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
          returnKeyType="done"
          autoCapitalize="none"
        />
      )}
    </View>
  );
}
