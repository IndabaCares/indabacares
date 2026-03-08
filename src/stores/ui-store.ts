import { create } from 'zustand';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UIState {
  // Feed
  newFeedItemCount: number;
  incrementNewFeedItems: () => void;
  resetNewFeedItems: () => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Bottom Sheet
  activeSheet: string | null;
  sheetData: unknown;
  openSheet: (name: string, data?: unknown) => void;
  closeSheet: () => void;

  // Network
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Presence
  onlineUsers: Set<string>;
  setOnlineUsers: (users: Set<string>) => void;

  // Realtime connection
  realtimeStatus: RealtimeStatus;
  setRealtimeStatus: (status: RealtimeStatus) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  // Feed
  newFeedItemCount: 0,
  incrementNewFeedItems: () =>
    set((state) => ({ newFeedItemCount: state.newFeedItemCount + 1 })),
  resetNewFeedItems: () => set({ newFeedItemCount: 0 }),

  // Toast
  toasts: [],
  showToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, toast.duration || 3000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Bottom Sheet
  activeSheet: null,
  sheetData: null,
  openSheet: (name, data) => set({ activeSheet: name, sheetData: data }),
  closeSheet: () => set({ activeSheet: null, sheetData: null }),

  // Network
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),

  // Presence
  onlineUsers: new Set<string>(),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  // Realtime connection
  realtimeStatus: 'connecting' as RealtimeStatus,
  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),
}));
