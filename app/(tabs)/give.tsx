import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSendRecognition } from '@/hooks/use-recognition';
import { sendRecognitionSchema } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { RecipientPicker } from '@/components/recognition/RecipientPicker';
import { ThumbsUpTypeSelector } from '@/components/recognition/ThumbsUpTypeSelector';
import { VisibilityPicker } from '@/components/recognition/VisibilityPicker';
import { HashtagInput } from '@/components/recognition/HashtagInput';
import { ImageAttachment } from '@/components/recognition/ImageAttachment';
import type { Visibility } from '@/types/database';

interface SelectedProfile {
  id: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

export default function GiveScreen() {
  const insets = useSafeAreaInsets();
  const sendRecognition = useSendRecognition();

  const [recipients, setRecipients] = useState<SelectedProfile[]>([]);
  const [thumbsUpTypeId, setThumbsUpTypeId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSend = () => {
    const input = {
      recipientIds: recipients.map((r) => r.id),
      thumbsUpTypeId: thumbsUpTypeId || '',
      message,
      visibility,
      imageUrl: imageUrl || undefined,
      hashtags,
    };

    const result = sendRecognitionSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    sendRecognition.mutate(result.data, {
      onSuccess: () => {
        // Reset form
        setRecipients([]);
        setThumbsUpTypeId(null);
        setMessage('');
        setVisibility('public');
        setImageUrl(null);
        setHashtags([]);
        router.push('/(tabs)');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        className="px-4 pt-4"
      >
        {/* Step 1: Recipients */}
        <Text className="mb-2 text-sm font-semibold text-slate-700">Who are you recognizing?</Text>
        <RecipientPicker
          selected={recipients}
          onSelect={(p) => setRecipients([...recipients, p])}
          onRemove={(id) => setRecipients(recipients.filter((r) => r.id !== id))}
        />
        {errors.recipientIds && (
          <Text className="mb-2 text-xs text-danger-500">{errors.recipientIds}</Text>
        )}

        {/* Step 2: Thumbs Up Type */}
        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-700">
          What kind of recognition?
        </Text>
        <ThumbsUpTypeSelector
          selectedId={thumbsUpTypeId}
          onSelect={(type) => setThumbsUpTypeId(type.id)}
        />
        {errors.thumbsUpTypeId && (
          <Text className="mb-2 text-xs text-danger-500">{errors.thumbsUpTypeId}</Text>
        )}

        {/* Step 3: Message */}
        <TextInput
          label="Your message"
          placeholder="Share what they did and why it matters (min 10 chars)..."
          value={message}
          onChangeText={(v) => {
            setMessage(v);
            setErrors((prev) => ({ ...prev, message: '' }));
          }}
          error={errors.message}
          multiline
          numberOfLines={4}
          maxLength={2000}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <Text className="mb-4 -mt-2 text-right text-xs text-slate-400">
          {message.length}/2000
        </Text>

        {/* Step 4: Image */}
        <ImageAttachment imageUrl={imageUrl} onImageChange={setImageUrl} />

        {/* Step 5: Visibility */}
        <Text className="mb-2 text-sm font-semibold text-slate-700">Who can see this?</Text>
        <VisibilityPicker value={visibility} onChange={setVisibility} />

        {/* Step 6: Hashtags */}
        <Text className="mb-2 text-sm font-semibold text-slate-700">Hashtags (optional)</Text>
        <HashtagInput hashtags={hashtags} onChange={setHashtags} />

        {/* Submit */}
        <Button
          title="Send Recognition"
          onPress={handleSend}
          loading={sendRecognition.isPending}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
