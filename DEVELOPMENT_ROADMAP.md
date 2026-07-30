# LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)
## QUẢN LÝ HỌC SINH TĂNG CƯỜNG

Lộ trình được chia thành các giai đoạn nhỏ, thực hiện cuốn chiếu và kiểm thử kỹ lưỡng sau mỗi bước.

---

### GIAI ĐOẠN 1: TẠO KHUNG VÀ GIAO DIỆN MẪU (UI MOCKUP & STRUCTURE)

- **Bước 0: Thiết lập Đặc tả và Nguyên tắc Chung** *(Đã hoàn thành)*
  - Tạo `PROJECT_SPEC.md` và `DEVELOPMENT_ROADMAP.md`.
  - Cập nhật thông tin ứng dụng trong `metadata.json`.

- **Bước 1: Khởi tạo Giao diện & System Shell**
  - Cấu hình theme màu Xanh ngọc nhạt (Teal), Typography, Toast, Modal base components.
  - Xây dựng Layout tổng thể: Sidebar bên trái, Header với công tắc giả lập Vai trò (Admin / Teacher / Pending).
  - Định nghĩa Type chuẩn (`Student`, `Class`, `Teacher`, `Attendance`, `ExtraStudySession`, `Report`).

- **Bước 2: Các Màn hình Mẫu (Mock UI)**
  - Màn hình Tổng quan (Dashboard Admin).
  - Màn hình Quản lý Lớp & Học sinh với dữ liệu mock.
  - Màn hình Phân ca Tăng cường mẫu.
  - Màn hình Điểm danh mẫu.
  - Màn hình Báo cáo mẫu.
  - Màn hình Quản lý Giáo viên mẫu.

---

### GIAI ĐOẠN 2: TÍCH HỢP NỀN TẢNG FIREBASE & BẢO MẬT

- **Bước 3: Tích hợp Firebase SDK**
  - Khởi tạo cấu hình Firebase trong `src/config/firebase.ts`.
  - Tạo các Service layer cách ly logic Firebase khỏi UI component.

- **Bước 4: Authentication & Luồng Đăng ký/Đăng nhập**
  - Xây dựng giao diện Đăng nhập / Đăng ký tài khoản giáo viên.
  - Xử lý trạng thái tài khoản `pending` chờ Admin duyệt.
  - Context quản lý phiên đăng nhập `AuthContext`.

- **Bước 5: Thiết lập Firestore Rules**
  - Soạn thảo `firestore.rules` kiểm tra vai trò `admin`, `teacher` và trạng thái `active`.
  - Chặn giáo viên truy cập danh sách người dùng hoặc thay đổi vai trò.

---

### GIAI ĐOẠN 3: TRIỂN KHAI CÁC CHỨC NĂNG NGHIỆP VỤ

- **Bước 6: Quản lý Lớp học**
  - CRUD danh sách lớp học.
  - Ràng buộc xóa an toàn (không xóa lớp đang chứa học sinh).

- **Bước 7: Quản lý Học sinh**
  - CRUD học sinh, tìm kiếm, lọc theo lớp.
  - Tạo và duy trì `studentId` duy nhất.

- **Bước 8: Nhập và Xuất Dữ liệu Excel/CSV**
  - Tích hợp module parse file Excel/CSV nhập danh sách học sinh.
  - Xuất mẫu danh sách ra file Excel/CSV.

- **Bước 9: Xếp ca Tăng cường**
  - Xếp học sinh vào ca Sáng / Chiều / Tối theo ngày.
  - Lọc theo lớp, giải phóng ca, lưu lịch sử phân ca.

- **Bước 10: Điểm danh**
  - Giao diện điểm danh nhanh cho ca học.
  - Ghi nhận trạng thái Có mặt, Vắng, Đi muộn, Ghi chú.
  - Sửa đổi phiên điểm danh cũ.

- **Bước 11: Báo cáo Thống kê**
  - Tổng hợp lượt vắng, muộn theo tháng và lớp.
  - Xuất báo cáo kết quả ra tệp Excel.

- **Bước 12: Quản lý Giáo viên (Admin Only)**
  - Duyệt tài khoản chờ (`pending` -> `active`).
  - Khóa / Mở khóa tài khoản giáo viên.

---

### GIAI ĐOẠN 4: TỐI ƯU REALTIME, QUOTA VÀ HOÀN THIỆN

- **Bước 13: Realtime & Tối ưu Quota Firebase**
  - Rà soát các `onSnapshot` listener: chỉ bật khi xem tab, tự động `unsubscribe` khi rời màn hình.
  - Bổ sung chỉ báo trạng thái kết nối (Đang đồng bộ / Đã đồng bộ / Mất kết nối).

- **Bước 14: Kiểm thử và Hoàn thiện**
  - Kiểm tra toàn bộ TypeSafety với TypeScript check.
  - Chạy thử nghiệm phân quyền Admin vs Giáo viên vs Tài khoản chờ duyệt.
  - Kiểm tra xử lý lỗi kết nối mạng và từ chối quyền Firestore.
  - Kiểm thử `compile_applet` thành công.
