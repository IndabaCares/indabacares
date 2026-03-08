// This route has moved to (onboarding)/employee-code.
// The AuthProvider routes unlinked users to /(onboarding)/employee-code.
// This file is kept only as a redirect guard for stale deep links.
import { Redirect } from 'expo-router';

export default function EmployeeCodeRedirect() {
  return <Redirect href="/(onboarding)/employee-code" />;
}
