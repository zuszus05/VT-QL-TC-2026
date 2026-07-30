# ĐẶC TẢ KỸ THUẬT VÀ NGUYÊN TẮC DỰ ÁN
## QUẢN LÝ HỌC SINH TĂNG CƯỜNG

---

### 1. MỤC ĐÍCH ỨNG DỤNG
- **Tên dự án:** QUẢN LÝ HỌC SINH TĂNG CƯỜNG
- **Mục tiêu:** Quản lý học sinh học tăng cường dùng nội bộ cho 4 – 5 giáo viên.
- **Phạm vi sử dụng:** Nhiều thiết bị (Máy tính, máy tính bảng, điện thoại), dùng lâu dài, không công khai rộng rãi.
- **Yêu cầu cốt lõi:**
  - Giao diện đơn giản, hiện đại, dễ thao tác.
  - Đồng bộ dữ liệu gần thời gian thực (realtime) giữa các giáo viên.
  - Tối ưu số lượt đọc/ghi Firebase để đáp ứng gói miễn phí (Spark Plan).
  - Kiến trúc rõ ràng, mô-đun hóa cao, dễ bảo trì và mở rộng bằng AI.

---

### 2. CÔNG NGHỆ DỰ KIẾN
- **Frontend Framework:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS (Tông màu chủ đạo: Xanh ngọc nhạt `#0D9488` / `#14B8A6` & Trắng neutral).
- **Backend & Database:** Firebase Authentication, Cloud Firestore.
- **Dữ liệu Nhập/Xuất:** Excel / CSV parser & generator.
- **Nguyên tắc công nghệ:**
  - Không sử dụng Gemini API trong ứng dụng frontend.
  - Không xây dựng backend server riêng khi Firestore đã đáp ứng đủ.
  - Không dùng thư viện cồng kềnh không cần thiết.
  - Không tạo component quá lớn chứa toàn bộ ứng dụng.

---

### 3. PHÂN QUYỀN VÀ XÁC THỰC (RBAC)

#### **1. Admin (Quản trị viên gốc)**
- Chỉ có **1 tài khoản admin gốc**.
- Có toàn quyền hệ thống:
  - Xem trang **Tổng quan** (Dashboard).
  - Quản lý danh sách giáo viên, duyệt tài khoản mới, khóa/mở khóa giáo viên.
  - Toàn quyền xem, thêm, sửa, xóa Học sinh, Lớp học, Lịch tăng cường, Điểm danh và Báo cáo.

#### **2. Giáo viên (Teacher)**
- Thao tác các chức năng nghiệp vụ: Học sinh, Lớp học, Tăng cường, Điểm danh, Báo cáo.
- **Quyền hồ sơ cá nhân & Bảo mật:**
  - Giáo viên được đọc hồ sơ của chính mình.
  - Giáo viên chỉ được sửa họ tên, bộ môn và các trường hồ sơ cá nhân được cho phép.
  - Giáo viên không được đọc hồ sơ người dùng khác.
  - Giáo viên không được thay đổi role, status, approved hoặc trường phân quyền.
  - Chỉ admin được xem và quản lý danh sách giáo viên.
- **Bị hạn chế:**
  - Không được xem trang **Tổng quan**.
  - Không được xem hoặc quản lý danh sách giáo viên.
  - Không được tự đổi vai trò, không tự duyệt tài khoản, không thể thành Admin.

#### **3. Tài khoản mới đăng ký (Pending)**
- Trạng thái mặc định: `pending` (chờ duyệt).
- Không thể truy cập dữ liệu nghiệp vụ cho đến khi Admin duyệt tài khoản.

> **Lưu ý bảo mật:** Việc ẩn UI chỉ phục vụ trải nghiệm người dùng. Bảo mật dữ liệu bắt buộc được thực thi qua **Firestore Security Rules**.

---

### 4. CÁC PHÂN HỆ CHỨC NĂNG CHÍNH

1. **Tổng quan (Admin Only):**
   - Thống kê tổng số học sinh, số lớp, số giáo viên hoạt động, số tài khoản chờ duyệt.
   - Phân bố học sinh theo khối/lớp, tình hình tăng cường trong ngày.
2. **Học sinh & Lớp học:**
   - Quản lý Lớp (Thêm, Sửa, Xóa an toàn khi không có dữ liệu ràng buộc).
   - Quản lý Học sinh (Thêm, Sửa, Xóa, Tìm kiếm, Lọc theo lớp).
   - Nhập / Xuất danh sách học sinh qua tệp Excel / CSV.
3. **Danh sách Tăng cường:**
   - Xếp ca học (Sáng, Chiều, Tối) theo ngày.
   - Giải phóng ca học, lưu lịch sử phân ca.
4. **Điểm danh:**
   - Chọn ngày & ca học để điểm danh.
   - Đánh dấu trạng thái:
     - `present`: Có mặt
     - `absent`: Vắng
     - `late`: Muộn
     - Có thể nhập lý do trong trường ghi chú nếu cần.
   - Chỉnh sửa phiên điểm danh cũ.
5. **Báo cáo & Thống kê:**
   - Báo cáo vắng / muộn theo tháng và lớp.
   - Xuất báo cáo tổng hợp ra file Excel.
6. **Quản lý Giáo viên (Admin Only):**
   - Danh sách tài khoản chờ duyệt, nút Duyệt / Khóa / Mở khóa tài khoản.

---

### 5. NGUYÊN TẮC TỐI ƯU FIREBASE & REALTIME

- **Chỉ kết nối Realtime khi thật sự cần:**
  - Sử dụng `onSnapshot` chỉ cho tab/màn hình đang mở (vd: danh sách học sinh lớp đang chọn, phiên điểm danh hiện tại).
  - Hủy listener (`unsubscribe()`) ngay khi chuyển tab hoặc đổi lớp.
- **Truy vấn đúng phạm vi:**
  - Query học sinh theo `classId`, điểm danh theo `date` + `sessionSlot`, báo cáo theo `month`.
  - Phân trang dữ liệu lịch sử.
- **Không đọc lại toàn bộ Collection:**
  - Sau thao tác Ghi, ưu tiên để listener nhận cập nhật tự động thay vì fetch lại thủ công.
- **Xóa Cache:**
  - Clear state / local cache khi đăng xuất hoặc đổi tài khoản.

---

### 6. NGUYÊN TẮC QUẢN LÝ DỮ LIỆU & BẢO MẬT

- **Mã học sinh cố định (`studentId`):**
  - Mỗi học sinh có một `studentId` duy nhất không thay đổi. Tất cả điểm danh, tăng cường liên kết qua `studentId`.
  - Không dùng Tên học sinh hay SBD làm key chính.
- **Audit Fields:** Mỗi document chứa `createdAt`, `updatedAt`, `createdBy`.
- **Thao tác an toàn:**
  - Dùng Write Batch hoặc Transactions cho các thao tác ảnh hưởng nhiều document.
  - Hiển thị thông báo lỗi rõ ràng nếu thao tác ghi thất bại (không nuốt lỗi bằng console).
- **Firestore Rules:**
  - Kiểm tra vai trò (`role == 'admin'` hoặc `role == 'teacher'`) và trạng thái `status == 'active'`.
  - Giáo viên không được đọc hồ sơ người dùng khác hay thay đổi phân quyền.

---

### 7. QUY CHUẨN GIAO DIỆN & MÃ NGUỒN

- **Màu sắc:** Xanh ngọc nhạt (Teal `#0D9488` / `#14B8A6`) làm màu chủ đạo + Nền trắng / Neutral xám nhạt.
- **Bố cục Desktop:** Thanh điều hướng cố định bên trái (Sidebar), vùng nội dung chính bên phải.
- **Trạng thái Trực quan:**
  - Có indicator trạng thái kết nối: *Đang đồng bộ*, *Đã đồng bộ*, *Mất kết nối*.
  - Nút bấm ghi dữ liệu phải có icon Loading & khống chế chống double-click.
  - Sử dụng Modal & Toast custom (không dùng `alert()` / `confirm()` trình duyệt).
- **Cấu trúc Thư mục Dự kiến:**
  ```text
  src/
    components/
      common/       # Button, Modal, Toast, Input, Badge
      layout/       # Sidebar, Header, PageContainer
      dashboard/    # Trang tổng quan
      students/     # Quản lý học sinh
      classes/      # Quản lý lớp
      extra-study/  # Phân ca tăng cường
      attendance/   # Điểm danh
      reports/      # Báo cáo
      teachers/     # Quản lý giáo viên
    hooks/          # Custom hooks (useAuth, useFirestore, useOnlineStatus)
    services/       # API layer tương tác Firebase
    types/          # TypeScript interfaces & types
    utils/          # Excel, Date, Validation helpers
    config/         # Firebase config
    mocks/          # Dữ liệu mẫu ban đầu
  ```
