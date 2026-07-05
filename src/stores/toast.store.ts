import { create } from "zustand";

export type ToastKind = "info" | "error" | "warning";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const AUTO_DISMISS_MS = 5000;

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Errors often carry a "Retry" action — keep them until the user dismisses or retries.
    if (toast.kind !== "error") {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, AUTO_DISMISS_MS);
    }
    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
