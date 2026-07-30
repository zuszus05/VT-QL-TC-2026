export function ErrorState({
  title = "Đã xảy ra lỗi",
  message = "Không thể tải dữ liệu vào lúc này.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200">
      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-2 font-bold">
        !
      </div>
      <h4 className="text-base font-semibold text-rose-800 mb-1">{title}</h4>
      <p className="text-sm text-rose-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-md hover:bg-rose-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
