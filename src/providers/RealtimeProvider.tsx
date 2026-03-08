import React from 'react';
import { useGlobalRealtime } from '@/hooks/use-realtime';
import { usePresence } from '@/hooks/use-presence';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useGlobalRealtime();
  usePresence();

  return (
    <>
      <ConnectionBanner />
      {children}
    </>
  );
}
