import { Stack } from 'expo-router';

/**
 * Onboarding stack — shown to authenticated users who have no company_id.
 *
 * Screens:
 *   employee-code   — enter the code provided by the administrator
 *   confirm-hotel   — review the resolved hotel and confirm
 *
 * The back button is hidden on employee-code (no previous onboarding screen).
 * The back button is shown on confirm-hotel so the user can correct a code.
 * The hardware back button on Android is not blocked — the user can go back
 * to employee-code from confirm-hotel without consequence because the session
 * has not been refreshed yet.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="employee-code"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="confirm-hotel"
        options={{ gestureEnabled: true }}
      />
    </Stack>
  );
}
