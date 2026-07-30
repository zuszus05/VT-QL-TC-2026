# IOS, PWA VÀ REALTIME AUDIT REPORT (Step 13D1)

**Ngày thực hiện:** 30/07/2026  
**Mục tiêu:** Đánh giá toàn bộ codebase hiện tại về khả năng tương thích iOS Safari, PWA (Add to Home Screen), Mobile UI/UX, Hiệu năng mobile, Firestore Realtime & Quota Spark, iOS Background Resume và Vercel Deployment readiness.

---

## A. TÓM TẮT HIỆN TRẠNG

1. **iOS Safari & Display:**
   - Sử dụng `h-screen` (`100vh`) tại `AppLayout.tsx` gây lỗi đẩy thanh navigation/footer xuống dưới thanh điều hướng động của iOS Safari.
   - Hầu hết các ô nhập liệu (`<input>`, `<select>`, `<textarea>`) đang cài đặt `font-size: 14px` (`text-sm`) hoặc `12px` (`text-xs`). Trên iOS Safari, bất kỳ input nào có `font-size < 16px` đều tự động kích hoạt chế độ **auto-zoom** khi focus, gây lệch layout màn hình nghiêm trọng.
   - Chưa hỗ trợ Safe Area Insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) cho tai thỏ/Dynamic Island và vạch Home Indicator của iPhone.

2. **PWA & Add to Home Screen:**
   - Chưa có tệp `manifest.webmanifest` / `manifest.json`.
   - Chưa có các thẻ meta dành riêng cho Apple iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`).
   - Chưa có icon PWA (192x192, 512x512, apple-touch-icon 180x180).

3. **Mobile UI & Responsive:**
   - Bảng ma trận báo cáo tháng 31 ngày (`MonthlyReportSection.tsx`), danh sách học sinh (`StudentsPage.tsx`), điểm danh (`AttendancePage.tsx`), lịch tăng cường (`ReinforcementPage.tsx`) có nguy cơ tràn ngang trên màn hình hẹp (375px - 414px) nếu không có thẻ bao bọc `overflow-x-auto` và cố định cột tên học sinh (`sticky left-0`).
   - Nhiều nút bấm có vùng chạm (`touch target`) nhỏ hơn mức chuẩn 44px x 44px của Apple HIG (như các icon sửa/xóa `p-1`, `h-7 w-7`).
   - Các Modal khi mở bàn phím ảo iOS bị đẩy tràn màn hình do thiếu `max-h-[85dvh]` và `overflow-y-auto`.

4. **Hiệu năng Mobile:**
   - Thư viện `xlsx` (SheetJS ~300KB) bị import tĩnh tại `src/utils/excelReader.ts`, kéo toàn bộ thư viện Excel vào Main Bundle ban đầu.
   - Tất cả các trang (`StudentsPage`, `ClassesPage`, `ReinforcementPage`, `AttendancePage`, `ReportPage`, `TeachersPage`) đều được import trực tiếp trong `App.tsx` mà chưa dùng `React.lazy()` và `Suspense`.

5. **Firestore Realtime & Quota Audit:**
   - **Hiện tại app chưa có bất kỳ `onSnapshot` listener nào cho dữ liệu nghiệp vụ** (chỉ có 1 listener `onAuthStateChanged` duy nhất cho Auth).
   - Toàn bộ dữ liệu đang đọc dạng pull (on-demand `getDocs`).
   - Ưu điểm: An toàn tuyệt đối cho hạn ngạch Firestore Spark free tier.
   - Nhược điểm: Chưa có tính năng đồng bộ thời gian thực khi nhiều giáo viên cùng mở ứng dụng trên các thiết bị khác nhau.

6. **Vercel Deployment:**
   - Chưa có tệp cấu hình `vercel.json` chứa quy tắc rewrite SPA (`/index.html`) để tránh lỗi 404 khi người dùng refresh ở các đường dẫn con.
   - Cấu hình Firebase config hiện đang hardcode trong `src/lib/firebase.ts`, cần chuyển sang dùng biến môi trường `import.meta.env.VITE_...` với giá trị dự phòng.

---

## B. LỖI / RỦI RO P0 (CRITICAL - CẦN SỬA NGAY TẠI 13D2 & 13D3)

### P0-01: Auto-zoom iOS Safari do Font-size Input < 16px
- **File:** `src/components/auth/LoginPage.tsx`, `src/components/students/StudentFilters.tsx`, `src/components/students/StudentFormModal.tsx`, `src/components/reinforcement/ReinforcementPage.tsx`, `src/components/classes/ClassFormModal.tsx`, `src/components/teachers/AddTeacherModal.tsx`, `src/components/teachers/EditTeacherModal.tsx`, `src/components/attendance/AttendancePage.tsx`, `src/components/reports/MonthlyReportSection.tsx`
- **Component/Function:** Toàn bộ `<input>`, `<select>`, `<textarea>`
- **Vấn đề:** Các input dùng class `text-sm` (14px) hoặc `text-xs` (12px).
- **Ảnh hưởng trên iOS:** iOS Safari tự động phóng to (zoom in) toàn bộ trang web mỗi khi giáo viên chạm focus vào ô nhập liệu/chọn lớp, làm vỡ giao diện và giáo viên phải dùng 2 ngón tay thu nhỏ lại thủ công.
- **Mức ưu tiên:** **P0**
- **Cách sửa:** Đặt font-size tối thiểu `text-base` (16px) cho tất cả `<input>`, `<select>`, `<textarea>` trên mobile (sử dụng Tailwind class `text-base sm:text-sm`).

### P0-02: Lỗi Layout Viewport Height (`100vh`) trên iOS Safari
- **File:** `src/components/layout/AppLayout.tsx`
- **Component:** `AppLayout` (`div className="flex h-screen ..."`)
- **Vấn đề:** Dùng `h-screen` (`100vh` trong CSS).
- **Ảnh hưởng trên iOS:** Thanh địa chỉ động (dynamic address bar) của Safari iOS làm ẩn một phần nội dung ở đáy màn hình (thanh điều hướng, nút lưu điểm danh) dưới các nút bấm của trình duyệt.
- **Mức ưu tiên:** **P0**
- **Cách sửa:** Thay `h-screen` bằng `h-[100dvh]` (Dynamic Viewport Height) hoặc `h-dvh`.

### P0-03: Thiếu cấu hình PWA & iOS Meta Tags làm app không thể dùng chuẩn Standalone
- **File:** `/index.html`
- **Component:** `<head>` section
- **Vấn đề:** Không có `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`, thiếu `apple-mobile-web-app-capable`, `apple-touch-icon`, `theme-color` và link `manifest.webmanifest`.
- **Ảnh hưởng trên iOS:** Khi giáo viên chọn "Add to Home Screen" trên iPhone/iPad, ứng dụng mở ra có vạch đen tai thỏ, không có biểu tượng app đẹp mắt, bị viền mảng trắng ở viền tai thỏ và không hoạt động mượt như PWA độc lập.
- **Mức ưu tiên:** **P0**
- **Cách sửa:** Bổ sung tệp `public/manifest.webmanifest`, các thẻ meta iOS chuẩn vào `index.html`, và tạo icon PWA đầy đủ kích thước.

---

## C. LỖI / RỦI RO P1 (HIGH - CẦN SỬA TẠI 13D3 & 13D4 & 13D6)

### P1-01: Thiếu Safe Area Insets cho Tai thỏ / Dynamic Island & Home Indicator
- **File:** `src/components/layout/AppHeader.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/attendance/AttendancePage.tsx` (thanh nút Lưu điểm danh)
- **Component:** Header, Drawer, Fixed Bottom Action Bars
- **Vấn đề:** Không có padding/margin hỗ trợ `env(safe-area-inset-top)` và `env(safe-area-inset-bottom)`.
- **Ảnh hưởng trên iOS:** Nút bấm ở góc trên bị che bởi tai thỏ / Dynamic Island; các nút bấm cố định ở đáy màn hình (như "Lưu điểm danh", "Chốt vắng") bị đè bởi vạch ngang Home Indicator của iPhone.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Thêm utility class hỗ trợ safe area: `pt-[env(safe-area-inset-top)]`, `pb-[env(safe-area-inset-bottom)]` hoặc CSS helper trong `index.css`.

### P1-02: Modal bị che bởi Bàn phím ảo iOS & Tràn chiều cao
- **File:** `src/components/students/StudentFormModal.tsx`, `src/components/students/ExcelValidationModal.tsx`, `src/components/reinforcement/ReinforcementMoveModal.tsx`, `src/components/teachers/AddTeacherModal.tsx`, `src/components/teachers/EditTeacherModal.tsx`
- **Component:** Dialog / Modal containers
- **Vấn đề:** Modal container không có `max-h-[85dvh]` và `overflow-y-auto`.
- **Ảnh hưởng trên iOS:** Khi mở bàn phím ảo trên iPhone, chiều cao còn lại của màn hình bị giảm mạnh, nút "Lưu" hoặc các field bên dưới modal bị bàn phím che lấp hoàn toàn, không cuộn xuống được.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Thêm `max-h-[85dvh] overflow-y-auto` vào phần thân modal, điều chỉnh `margin-bottom` cho phù hợp với bàn phím.

### P1-03: Thư viện XLSX (SheetJS ~300KB) bị đưa vào Main Bundle
- **File:** `src/utils/excelReader.ts`
- **Function:** Top-level import `import * as XLSX from "xlsx";`
- **Vấn đề:** Mặc dù `MonthlyReportSection.tsx` đã dùng dynamic `import("xlsx")`, nhưng `excelReader.ts` lại import tĩnh `xlsx` ở ngay đầu tệp.
- **Ảnh hưởng trên iOS:** Làm tăng dung lượng tải JavaScript ban đầu trên mạng di động 3G/4G, khiến ứng dụng tải chậm trên iPhone.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Chuyển `excelReader.ts` sang sử dụng dynamic `import("xlsx")` bên trong hàm xử lý file Excel.

### P1-04: Thiếu Route Rewrite Vercel (`vercel.json`)
- **File:** `/vercel.json` (chưa tồn tại)
- **Component:** Server Routing configuration
- **Vấn đề:** Thiếu file cấu hình cho Vercel SPA.
- **Ảnh hưởng:** Khi triển khai lên Vercel, nếu người dùng refresh trình duyệt hoặc truy cập trực tiếp URL, Vercel sẽ trả về lỗi **404 Not Found**.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Tạo tệp `/vercel.json` với nội dung rewrites tới `/index.html`.

### P1-05: Bảng Báo cáo Tháng (31 ngày) tràn màn hình hẹp & mất cột tên học sinh khi cuộn
- **File:** `src/components/reports/MonthlyReportSection.tsx`
- **Component:** Bảng ma trận 31 ngày
- **Vấn đề:** Bảng quá rộng trên màn hình điện thoại (375px). Khi giáo viên cuộn ngang sang ngày 15-31, cột Họ và tên học sinh bị cuộn mất khỏi màn hình.
- **Ảnh hưởng trên iOS:** Giáo viên không biết dòng điểm danh hiện tại thuộc về học sinh nào nếu phải cuộn qua lại liên tục.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Cài đặt `sticky left-0 z-10 bg-white` cho cột Tên học sinh và thêm shadow phân cách khi cuộn.

### P1-06: Thiếu Lazy Loading cho các Trang Chính (`React.lazy`)
- **File:** `src/App.tsx`
- **Component:** Router & Page imports
- **Vấn đề:** Tất cả 6 trang (`StudentsPage`, `ClassesPage`, `ReinforcementPage`, `AttendancePage`, `ReportPage`, `TeachersPage`) đều import tĩnh trong `App.tsx`.
- **Ảnh hưởng trên iOS:** Tải toàn bộ code của ứng dụng ngay lần đầu mở, tốn tài nguyên bộ nhớ RAM và làm tăng First Contentful Paint (FCP) trên thiết bị di động.
- **Mức ưu tiên:** **P1**
- **Cách sửa:** Áp dụng `React.lazy()` và `Suspense` với Loading Fallback mượt mà cho các trang.

---

## D. VẤN ĐỀ P2 (MEDIUM - CẦN TỐI ƯU TẠI 13D3 & 13D5)

### P2-01: Touch Target Nút Bấm Thao Tác Nhỏ (< 44px)
- **File:** `src/components/students/StudentsPage.tsx`, `src/components/teachers/TeachersPage.tsx`, `src/components/reinforcement/ReinforcementPage.tsx`
- **Component:** Các nút Icon sửa/xóa/chuyển ca
- **Vấn đề:** Dùng class `p-1`, `h-7 w-7` (~28px x 28px).
- **Ảnh hưởng trên iOS:** Dễ bấm nhầm trên màn hình cảm ứng điện thoại di động.
- **Mức ưu tiên:** **P2**
- **Cách sửa:** Tăng kích thước vùng chạm tối thiểu 44px x 44px bằng `p-2.5` hoặc `min-h-[44px] min-w-[44px] flex items-center justify-center`.

### P2-02: Bộ lọc Tăng Cường Chiếm Toàn Bộ Màn Hình Mobile
- **File:** `src/components/reinforcement/ReinforcementPage.tsx`
- **Component:** Section Bộ lọc
- **Vấn đề:** 6 ô dropdown xếp chồng chiều dọc chiếm hết chiều cao màn hình di động trước khi xem được danh sách.
- **Ảnh hưởng trên iOS:** Giáo viên phải cuộn rất xa mới thấy danh sách học sinh.
- **Mức ưu tiên:** **P2**
- **Cách sửa:** Chuyển bộ lọc trên mobile thành dạng collapsible/accordion hoặc lưới 2 cột hẹp gọn.

### P2-03: Thiếu Nút "Tải lại / Cập nhật" thủ công khi mở lại từ Background iOS
- **File:** `src/components/attendance/AttendancePage.tsx`, `src/components/reports/ReportPage.tsx`
- **Component:** Header trang / Toolbar
- **Vấn đề:** Do ứng dụng dùng giao thức Query khi cần (getDocs), khi giáo viên mở lại ứng dụng sau khi iPhone bị khóa màn hình / background, dữ liệu trong RAM cache có thể bị cũ nếu giáo viên khác vừa sửa.
- **Ảnh hưởng trên iOS:** Giáo viên không biết dữ liệu bị cũ trừ khi tự chuyển ngày/tháng.
- **Mức ưu tiên:** **P2**
- **Cách sửa:** Thêm nút "Làm mới dữ liệu" (Refresh button) hoặc sự kiện `visibilitychange` tự động làm mới RAM cache khi ứng dụng active lại.

### P2-04: Hiệu ứng Hover-only không phản hồi tốt trên Màn hình Cảm ứng iOS
- **File:** `src/components/common/*`, `src/components/layout/Sidebar.tsx`
- **Component:** Menu items, Card actions
- **Vấn đề:** Phụ thuộc vào `hover:bg-slate-100` hoặc `group-hover:opacity-100`.
- **Ảnh hưởng trên iOS:** Trên màn hình cảm ứng iOS không có con trỏ chuột, hiệu ứng hover bị "dính" (stuck hover state) sau khi chạm ngón tay.
- **Mức ưu tiên:** **P2**
- **Cách sửa:** Bổ sung trạng thái `active:bg-slate-200` và đảm bảo các nút bấm hiển thị rõ ràng không cần qua hover.

---

## E. CÁC FILE CẦN SỬA TỔNG HỢP

1. `/index.html` (Thẻ meta iOS, Safe Area, Viewport, PWA Manifest)
2. `/public/manifest.webmanifest` (Tệp PWA Manifest mới)
3. `/vercel.json` (Tệp cấu hình SPA rewrite Vercel mới)
4. `src/index.css` (Cấu hình CSS utilities cho Safe Area Insets, font-size input mobile)
5. `src/App.tsx` (Lazy load trang bằng `React.lazy`, quản lý trạng thái active resume)
6. `src/components/layout/AppLayout.tsx` (Thay `h-screen` thành `h-[100dvh]`, Safe area)
7. `src/components/layout/AppHeader.tsx` (Safe area top & touch target)
8. `src/components/auth/LoginPage.tsx` (Fix font-size input 16px tránh auto-zoom iOS)
9. `src/components/students/StudentFilters.tsx` & `StudentFormModal.tsx` (Font-size 16px, Modal scroll iOS)
10. `src/components/students/ExcelValidationModal.tsx` (Modal overflow & dynamic import excel)
11. `src/components/attendance/AttendancePage.tsx` (Safe area bottom, font-size 16px, touch target)
12. `src/components/reports/MonthlyReportSection.tsx` (Sticky column tên học sinh, dynamic import xlsx)
13. `src/components/reinforcement/ReinforcementPage.tsx` (Mobile filter layout, font-size 16px)
14. `src/utils/excelReader.ts` (Chuyển top-level xlsx import sang dynamic import)
15. `src/lib/firebase.ts` (Sử dụng biến môi trường VITE_... linh hoạt)

---

## F. DANH SÁCH LISTENER FIRESTORE HIỆN TẠI

| # | File / Component | Listener Method | Collection / Target | Mục đích | Rủi ro / Nhận xét |
|---|---|---|---|---|---|
| 1 | `src/App.tsx` | `onAuthStateChanged` | Firebase Auth | Theo dõi phiên đăng nhập của người dùng | **AN TOÀN**: Mẫu chuẩn của Firebase, tự động unsubscribe trong `useEffect` cleanup. |
| - | *Data collections* | `onSnapshot` | *None* | *Không có listener Firestore realtime nào* | **KHÔNG CÓ RỦI RO LỚN VỀ QUOTA**: Toàn bộ dữ liệu hiện tại dùng query một lần (`getDocs`). |

**Đánh giá chiến lược Realtime cho 13D5:**
- **Không nên** thêm `onSnapshot` lắng nghe toàn bộ collection `attendance_records` hoặc `students`. Điều này sẽ làm bùng nổ cước phí / hạn ngạch Spark Free Tier.
- **Nếu cần realtime cho điểm danh giữa nhiều giáo viên**: Chỉ đăng ký `onSnapshot` phạm vi hẹp scoped đúng: `attendanceDate == selectedDate` AND `session == selectedSession`. Khi chuyển ngày/ca hoặc unmount component, **bắt buộc** phải gọi `unsubscribe()`.

---

## G. KẾ HOẠCH TRIỂN KHAI NGHĨA VỤ RẮT GỌN (CHỈ DẪN CHO CÁC BƯỚC TIẾP THEO)

### Bước 13D2: PWA & Home Screen Optimization
- Tạo `public/manifest.webmanifest` (icon, colors, display standalone).
- Cập nhật `index.html`: Thêm thẻ `viewport-fit=cover`, iOS meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`).
- Cấu hình theme color mượt mà khớp với giao diện Slate header.

### Bước 13D3: Mobile UI & iOS Safari Ergonomics
- Sửa `h-screen` thành `h-[100dvh]` trong `AppLayout.tsx`.
- Cài đặt font-size tối thiểu `16px` cho tất cả ô nhập liệu trên mobile (`text-base sm:text-sm`) để triệt tiêu lỗi auto-zoom của iOS Safari.
- Bổ sung Safe Area padding cho Header, Mobile Drawer và Bottom Action Bar ("Lưu điểm danh").
- Thêm `max-h-[85dvh] overflow-y-auto` cho tất cả Modal.
- Cài đặt `sticky left-0` cho cột Tên học sinh trong Bảng Báo Cáo Tháng 31 ngày.
- Tăng vùng chạm nút bấm (touch targets) lên tối thiểu 44px x 44px.

### Bước 13D4: Mobile Performance & Code Splitting
- Chuyển `excelReader.ts` sang dùng dynamic `import("xlsx")` để gỡ bỏ SheetJS khỏi Main Bundle ban đầu.
- Áp dụng `React.lazy()` và `Suspense` cho 6 trang ứng dụng trong `App.tsx`.

### Bước 13D5: Realtime & Background Stability
- Bổ sung sự kiện `visibilitychange` lắng nghe khi app active lại từ background iOS để hủy RAM cache cũ nếu cần.
- Nếu bổ sung Realtime Sync điểm danh: chỉ xài `onSnapshot` scoped theo `attendanceDate + session` và luôn cleanup `unsubscribe()`.

### Bước 13D6: Vercel Deployment Readiness
- Tạo tệp `/vercel.json` định tuyến SPA rewrites.
- Chuẩn hóa `src/lib/firebase.ts` với biến môi trường `import.meta.env.VITE_FIREBASE_...`.

---

## H. CÁC NỘI DUNG KHÔNG NÊN LÀM TRƯỚC RELEASE

1. **Không triển khai Service Worker offline-first phức tạp**: Caching dữ liệu Firestore thông qua Service Worker hoặc Workbox dễ gây xung đột dữ liệu cũ/mới và tràn bộ nhớ iOS Safari Cache.
2. **Không lưu dữ liệu điểm danh/học sinh vào `localStorage`**: Dữ liệu nghiệp vụ phải giữ trên Firestore làm Single Source of Truth.
3. **Không thay đổi Firestore Schema hoặc Firestore Rules**: Giữ nguyên schema hiện tại đã qua nghiệm thu.
4. **Không thêm listener `onSnapshot` cho toàn bộ collection**: Giữ hạn ngạch đọc Spark Free Tier an toàn.
5. **Không thêm thư viện UI bên ngoài**: Chỉ dùng Tailwind CSS utility classes sẵn có để tối ưu dung lượng bundle.

---

**Kết luận Audit 13D1:** Báo cáo hoàn tất. Codebase hiện tại hoạt động rất tốt ở khía cạnh logic nghiệp vụ, chỉ cần tinh chỉnh nhẹ các thẻ HTML meta, CSS Viewport, Font-size mobile, Lazy load và Vercel rewrite ở các bước 13D2 - 13D6 để đạt độ mượt hoàn hảo trên iOS iPhone/iPad.
