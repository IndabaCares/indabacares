import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useUpdateProfile } from '@/hooks/use-profiles';
import { useImageUpload } from '@/hooks/use-image-upload';
import { Avatar } from '@/components/ui/Avatar';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);

  const updateProfile = useUpdateProfile();
  const { upload, uploading } = useImageUpload('avatars');

  const handleAvatarPick = async () => {
    const url = await upload();
    if (url) setAvatarUrl(url);
  };

  const handleSave = () => {
    const updates: Record<string, string | undefined> = {};
    if (displayName !== (user?.displayName || '')) updates.display_name = displayName || undefined;
    if (jobTitle !== (user?.jobTitle || '')) updates.job_title = jobTitle || undefined;
    if (avatarUrl !== user?.avatarUrl) updates.avatar_url = avatarUrl || undefined;

    if (Object.keys(updates).length === 0) {
      router.back();
      return;
    }

    updateProfile.mutate(updates, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-6" keyboardShouldPersistTaps="handled">
      {/* Avatar */}
      <Pressable onPress={handleAvatarPick} className="mb-6 items-center" disabled={uploading}>
        <Avatar uri={avatarUrl} name={user?.fullName || 'User'} size="xl" />
        <Text className="mt-2 text-sm font-medium text-primary-500">
          {uploading ? 'Uploading...' : 'Change photo'}
        </Text>
      </Pressable>

      <TextInput
        label="Display Name"
        placeholder="How should we show your name?"
        value={displayName}
        onChangeText={setDisplayName}
        hint="Leave blank to use your full name"
      />

      <TextInput
        label="Job Title"
        placeholder="e.g. Software Engineer"
        value={jobTitle}
        onChangeText={setJobTitle}
      />

      <View className="mt-4 flex-row">
        <View className="mr-2 flex-1">
          <Button title="Cancel" variant="outline" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <Button
            title="Save"
            onPress={handleSave}
            loading={updateProfile.isPending}
          />
        </View>
      </View>
    </ScrollView>
  );
}
