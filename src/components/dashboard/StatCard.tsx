import { ReactNode } from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: ReactNode;
  icon: ReactNode;
  badgeText?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
  hideBadgeOnMobile?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeVariant = "default",
  hideBadgeOnMobile = false,
  onClick,
}: StatCardProps) {
  const CardWrapper = ({ children }: { children: ReactNode }) => {
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className="w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-xl"
        >
          <Card className="h-full p-3.5 sm:p-4 md:p-5 border-slate-200/90 hover:border-teal-300 hover:shadow-md cursor-pointer">
            {children}
          </Card>
        </button>
      );
    }
    return <Card className="h-full p-3.5 sm:p-4 md:p-5 border-slate-200/90">{children}</Card>;
  };

  return (
    <CardWrapper>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 md:space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
          {badgeText && (
            <div className={hideBadgeOnMobile ? "hidden md:block" : ""}>
              <Badge variant={badgeVariant}>{badgeText}</Badge>
            </div>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}
