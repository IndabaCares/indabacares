import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

interface UploadResult {
  publicUrl: string;
}

/**
 * Convert base64 string → Uint8Array.
 * atob() is a global in React Native 0.73+ (Expo 51+).
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a safe content-type + extension from the image URI.
 * Normalises HEIC/HEIF → jpeg (Supabase bucket does not allow image/heic).
 */
function mimeFromUri(uri: string): { contentType: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.includes('.png'))  return { contentType: 'image/png',  ext: 'png'  };
  if (lower.includes('.webp')) return { contentType: 'image/webp', ext: 'webp' };
  if (lower.includes('.heic') || lower.includes('.heif'))
    return { contentType: 'image/jpeg', ext: 'jpg' };
  return { contentType: 'image/jpeg', ext: 'jpg' };
}

/**
 * Upload a local image URI to a Supabase Storage bucket.
 *
 * Reads the file via expo-file-system (base64) then decodes to Uint8Array
 * before uploading. XHR blob reading is unreliable on iOS — this approach
 * works on both platforms.
 */
export async function uploadImage(
  uri: string,
  bucket: string,
  path: string,
): Promise<UploadResult> {
  const { contentType, ext } = mimeFromUri(uri);
  const filePath = `${path}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });

  const bytes = base64ToUint8Array(base64);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, bytes, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { publicUrl: data.publicUrl };
}
