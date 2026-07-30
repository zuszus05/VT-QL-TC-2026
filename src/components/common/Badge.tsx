import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const baseStyle =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase";

  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-teal-50 text-teal-700 border border-teal-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  return (
    <span className={cn(baseStyle, variants[variant], className)}>
      {children}
    </span>
  );
}
