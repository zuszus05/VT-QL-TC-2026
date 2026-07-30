import { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 transition-shadow hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
