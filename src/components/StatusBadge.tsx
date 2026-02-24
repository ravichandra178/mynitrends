import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "info" | "neutral";

const variants: Record<Variant, string> = {
  success: "bg-badge-success text-badge-success-foreground",
  warning: "bg-badge-warning text-badge-warning-foreground",
  info: "bg-badge-info text-badge-info-foreground",
  neutral: "bg-badge-neutral text-badge-neutral-foreground",
};

export function StatusBadge({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", variants[variant])}>
      {children}
    </span>
  );
}
