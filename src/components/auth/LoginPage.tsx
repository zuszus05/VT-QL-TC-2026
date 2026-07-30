import { useState, FormEvent } from "react";
import { signIn } from "../../services/authService";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Vui lòng nhập địa chỉ email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Địa chỉ email không đúng định dạng.");
      return;
    }

    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      await signIn(trimmedEmail, password);
      // Khi thành công, onAuthStateChanged trong App.tsx sẽ tự động nhận diện
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const errorCode = firebaseError.code || "";

      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-email"
      ) {
        setErrorMessage("Email hoặc mật khẩu không đúng.");
      } else if (errorCode === "auth/user-disabled") {
        setErrorMessage("Tài khoản đăng nhập đã bị vô hiệu hóa.");
      } else if (errorCode === "auth/too-many-requests") {
        setErrorMessage("Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau.");
      } else if (
        errorCode === "auth/network-request-failed" ||
        errorCode.includes("network-request-failed")
      ) {
        setErrorMessage("Không thể kết nối Firebase. Vui lòng kiểm tra mạng.");
      } else {
        setErrorMessage("Không thể đăng nhập. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-min-viewport-height bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header Logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-teal-500 text-slate-900 flex items-center justify-center font-black text-2xl shadow-md">
            TH
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Quản lý học sinh
            </h1>
            <p className="text-xs text-teal-400 font-semibold mt-0.5">
              Học tăng cường
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="border-t border-slate-700/60 pt-5 text-center">
          <h2 className="text-base font-semibold text-slate-200">
            Đăng nhập hệ thống
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Vui lòng nhập tài khoản được cấp để tiếp tục
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs font-medium flex items-center gap-2">
            <svg
              className="w-4 h-4 text-rose-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Địa chỉ Email
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@school.edu.vn"
              disabled={loading}
              autoComplete="email"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Mật khẩu
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
