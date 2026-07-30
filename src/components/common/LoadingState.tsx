export function LoadingState({ message = "Đang tải dữ liệu..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
      <div className="animate-spin h-8 w-8 border-3 border-teal-600 border-t-transparent rounded-full mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
