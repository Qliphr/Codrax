import { COLORS } from "@/lib/theme";
import { useToastStore, type ToastKind } from "@/stores/toast.store";

const KIND_COLOR: Record<ToastKind, string> = {
  info: COLORS.textSecondary,
  error: "#FF4757",
  warning: "#FFD166",
};

const KIND_ICON: Record<ToastKind, string> = {
  info: "ⓘ",
  error: "✕",
  warning: "⚠",
};

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex w-[340px] flex-col gap-2">
      {toasts.map((t) => {
        const color = KIND_COLOR[t.kind];
        return (
          <div
            key={t.id}
            className="vos-pill-in flex items-start gap-2.5 rounded-lg border p-3"
            style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}
          >
            <span className="mt-0.5 font-sans text-xs" style={{ color }}>
              {KIND_ICON[t.kind]}
            </span>
            <div className="flex-1 text-[12.5px] leading-snug" style={{ color: COLORS.textSoft }}>
              {t.message}
              {t.actionLabel && t.onAction && (
                <button
                  onClick={() => {
                    t.onAction?.();
                    dismiss(t.id);
                  }}
                  className="ml-2 font-sans text-[11px] font-semibold underline"
                  style={{ color }}
                >
                  {t.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="font-sans text-xs"
              style={{ color: COLORS.textMuted }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
