import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

interface UploadResult {
  publicUrl: string;
}

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function uploadImage(
  uri: string,
  bucket: string,
  path: string
): Promise<UploadResult> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${path}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { publicUrl: data.publicUrl };
}
