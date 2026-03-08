import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useImageUpload } from '@/hooks/use-image-upload';

interface ImageAttachmentProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
}

export function ImageAttachment({ imageUrl, onImageChange }: ImageAttachmentProps) {
  const { upload, uploading } = useImageUpload('recognition-images');

  const handlePick = async () => {
    const url = await upload();
    if (url) onImageChange(url);
  };

  if (imageUrl) {
    return (
      <View className="mb-4">
        <Image
          source={{ uri: imageUrl }}
          className="h-48 w-full rounded-xl"
          contentFit="cover"
        />
        <Pressable
          onPress={() => onImageChange(null)}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
        >
          <Ionicons name="close" size={18} color="#ffffff" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePick}
      disabled={uploading}
      className="mb-4 flex-row items-center rounded-xl border border-dashed border-slate-300 px-4 py-3"
    >
      <Ionicons name="image-outline" size={20} color="#94a3b8" />
      <Text className="ml-2 text-sm text-slate-500">
        {uploading ? 'Uploading...' : 'Add an image (optional)'}
      </Text>
    </Pressable>
  );
}
