import React from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmHotel, useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';

/**
 * Confirm Hotel screen — step 2 of onboarding.
 *
 * At this point the employee code has already been claimed (step 1).
 * The database has company_id set on the profile, but the JWT does not
 * yet contain it. This screen shows the user which hotel they are joining
 * and asks them to confirm.
 *
 * On confirm:
 *   useConfirmHotel calls supabase.auth.refreshSession()
 *   → new JWT contains company_id
 *   → setSession() updates the store
 *   → AuthProvider detects isLinked = true
 *   → AuthProvider routes to /(tabs) automatically
 *
 * No explicit router.push needed — the route guard handles navigation.
 */
export default function ConfirmHotelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { companyName, companyId, primaryColor, logoUrl } =
    useLocalSearchParams<{
      companyName:  string;
      companyId:    string;
      primaryColor: string;
      logoUrl:      string;
    }>();

  const confirmHotel = useConfirmHotel();
  const logout       = useLogout();

  const brandColor = primaryColor ?? '#CE21FB';

  const handleConfirm = () => {
    confirmHotel.mutate(undefined, {
      onError: (err: Error) => {
        console.error('Session refresh failed:', err.message);
        logout.mutate();
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Brand strip — uses the hotel's primary colour */}
      <View
        className="items-center px-6 pb-12"
        style={{ paddingTop: insets.top + 40, backgroundColor: brandColor }}
      >
        <View
          className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-white/20"
        >
          <Text className="text-5xl font-bold text-white">
            {companyName?.charAt(0) ?? '?'}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-white">
          {companyName ?? 'Your Hotel'}
        </Text>
        <Text className="mt-1 text-sm text-white/70">Indaba Group of Hotels</Text>
      </View>

      {/* Confirmation card */}
      <View
        className="flex-1 rounded-t-3xl bg-white px-6"
        style={{ marginTop: -16, paddingTop: 32, paddingBottom: insets.bottom + 24 }}
      >
        <Text className="text-center text-xl font-bold text-slate-900">
          Is this your hotel?
        </Text>
        <Text className="mt-3 text-center text-sm text-slate-500 leading-5">
          Your employee code has been verified. Confirm below to link your account
          and enter your workspace.
        </Text>

        <View className="mt-8">
          {confirmHotel.isError && (
            <Text className="mb-4 text-center text-sm text-danger-500">
              {(confirmHotel.error as Error).message}
            </Text>
          )}

          {confirmHotel.isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator size="large" color={brandColor} />
              <Text className="mt-3 text-sm text-slate-400">
                Activating your workspace...
              </Text>
            </View>
          ) : (
            <>
              <Button
                title={`Yes, join ${companyName ?? 'this hotel'}`}
                onPress={handleConfirm}
                size="lg"
              />

              <Pressable onPress={handleBack} className="mt-4 items-center py-2">
                <Text className="text-sm text-slate-400">Not your hotel? Go back</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
