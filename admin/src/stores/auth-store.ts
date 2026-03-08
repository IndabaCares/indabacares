import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppRole } from '@/types/database';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: AppRole;
  jobTitle: string | null;
  department: { id: string; name: string } | null;
  pointsBalance: number;
  starsBalance: number;
  givingBalance: number;
  createdAt: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  features: Record<string, unknown>;
}

interface AuthState {
  session: Session | null;
  user: AdminUser | null;
  company: AdminCompany | null;
  isLoading: boolean;

  setSession: (session: Session | null) => void;
  setUserContext: (user: AdminUser, company: AdminCompany) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  company: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setUserContext: (user, company) => set({ user, company, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ session: null, user: null, company: null }),
}));
