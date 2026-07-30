import { useState, useEffect } from "react";

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col gap-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isOnline ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
          }`}
        />
        <span className="font-semibold text-slate-700">DỮ LIỆU FIREBASE</span>
      </div>
      <div className="text-[11px] text-slate-500">
        {isOnline ? "Đang có kết nối mạng" : "Mất kết nối mạng"}
      </div>
    </div>
  );
}
