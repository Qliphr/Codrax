import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/theme";

function Checkbox({ className, style, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[--vos-accent] data-[state=checked]:border-[--vos-accent]",
        "focus-visible:ring-2 focus-visible:ring-[--vos-accent]/40",
        className,
      )}
      style={{
        borderColor: COLORS.borderStrong,
        backgroundColor: "transparent",
        "--vos-accent": COLORS.accent,
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
        style={{ color: "#fff" }}
      >
        <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
