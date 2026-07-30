import { ReactNode } from "react";

export function EmptyState({
  title = "Không có dữ liệu",
  description = "Chưa có thông tin để hiển thị.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-xl font-bold">
        ∅
      </div>
      <h4 className="text-base font-semibold text-slate-700 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
