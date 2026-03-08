import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AuthMeResponse } from '@/types/api';

interface AuthState {
  // Session
  session: Session | null;
  isHydrated: boolean;

  // User context (from auth-me)
  user: AuthMeResponse['user'] | null;
  company: AuthMeResponse['company'] | null;
  unreadNotifications: number;
  moodSubmittedToday: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setHydrated: (hydrated: boolean) => void;
  setUserContext: (data: AuthMeResponse) => void;
  updateBalances: (balances: Partial<Pick<AuthMeResponse['user'], 'pointsBalance' | 'starsBalance' | 'givingBalance'>>) => void;
  incrementUnread: () => void;
  setUnreadCount: (count: number) => void;
  setMoodSubmitted: (submitted: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isHydrated: false,
  user: null,
  company: null,
  unreadNotifications: 0,
  moodSubmittedToday: false,

  setSession: (session) => set({ session }),
  setHydrated: (isHydrated) => set({ isHydrated }),

  setUserContext: (data) =>
    set({
      user: data.user,
      company: data.company,
      unreadNotifications: data.session.unreadNotifications,
      moodSubmittedToday: data.session.moodSubmittedToday,
    }),

  updateBalances: (balances) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...balances } : null,
    })),

  incrementUnread: () =>
    set((state) => ({
      unreadNotifications: state.unreadNotifications + 1,
    })),

  setUnreadCount: (count) => set({ unreadNotifications: count }),

  setMoodSubmitted: (submitted) => set({ moodSubmittedToday: submitted }),

  logout: () =>
    set({
      session: null,
      user: null,
      company: null,
      unreadNotifications: 0,
      moodSubmittedToday: false,
    }),
}));
