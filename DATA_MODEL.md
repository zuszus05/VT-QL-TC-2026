# TÀI LIỆU MÔ HÌNH DỮ LIỆU & QUY TẮC NGHIỆP VỤ (DATA MODEL)
**Dự án:** Quản Lý Học Sinh Tăng Cường (THCS)

---

## 1. CÁC THỰC THỂ CHÍNH (CORE ENTITIES)

### 1.1 Lớp Học (`SchoolClass`)
- **Key Fields**:
  - `classId`: ID duy nhất ổn định (ví dụ: `cls-6a`).
  - `className`: Tên lớp hiển thị (ví dụ: `6A`, `6B`, `7A`, `9A1`). Được chuẩn hóa dạng in hoa.
  - `grade`: Khối học (`6 | 7 | 8 | 9`). Tên lớp phải bắt đầu bằng chữ số của khối.
  - `isActive`: Trạng thái lớp học (hoạt động / tạm ngừng).
  - `createdAt`, `updatedAt`: Thời gian khởi tạo/cập nhật (chuỗi ISO).

### 1.2 Học Sinh (`Student`)
- **Key Fields**:
  - `studentId`: ID duy nhất ổn định ngẫu nhiên (ví dụ: `std-601`), không trùng lặp toàn hệ thống.
  - `fullName`: Họ và tên học sinh (đã chuẩn hóa khoảng trắng).
  - `grade`: Khối học (`6 | 7 | 8 | 9`).
  - `classId`: Tham chiếu lớp học (`SchoolClass.classId`).
  - `candidateNumber`: Số báo danh (SBD, số nguyên > 0).
  - `dateOfBirth`, `parentName`, `parentPhone`, `note`, `isActive`: Thông tin phụ huynh và ghi chú.

### 1.3 Người Dùng (`AppUser` / `UserProfile`)
- **Key Fields**:
  - `userId`: ID định danh tài khoản.
  - `fullName`, `email`, `title`, `subject`: Thông tin cá nhân và bộ môn phụ trách.
  - `role`: Phân quyền (`admin` | `teacher`).
  - `status`: Trạng thái tài khoản (`pending` | `approved` | `blocked`).

### 1.4 Bản Ghi Tăng Cường (`ExtraStudyRecord`)
- **Key Fields**:
  - `extraStudyId`: ID bản ghi tăng cường (ví dụ: `ext-101`).
  - `studentId`: Tham chiếu ID học sinh (`Student.studentId`). Không lưu `fullName` hay `candidateNumber` trực tiếp để tránh dư thừa dữ liệu.
  - `subject`: Môn học tăng cường (`algebra` | `geometry` | `science` | `practice-test`).
  - `sourceDate`, `sourceSession`: Ngày và ca học phát sinh nhu cầu tăng cường (`morning` | `afternoon`).
  - `targetDate`, `targetSession`: Ngày và ca học được xếp lịch phụ đạo (`morning` | `afternoon` | `evening`).
  - `status`: Trạng thái (`scheduled` | `completed` | `cancelled` | `archived`).
  - `createdByUserId`: ID tài khoản khởi tạo.

### 1.5 Bản Ghi Điểm Danh (`AttendanceRecord`)
- **Key Fields**:
  - `attendanceId`: ID điểm danh.
  - `studentId`: Tham chiếu học sinh.
  - `attendanceDate`: Ngày điểm danh (`YYYY-MM-DD`).
  - `session`: Ca điểm danh (`morning` | `afternoon` | `evening`).
  - `status`: Trạng thái (`present` | `absent` | `late`).

---

## 2. CÁC QUY TẮC NGHIỆP VỤ BẮT BUỘC (BUSINESS RULES)

### 2.1 Quy Tắc Số Báo Danh (SBD / `candidateNumber`)
1. **Duy nhất theo Khối**: Số báo danh duy nhất trong phạm vi **Toàn Khối** (`grade`).
   - *Ví dụ Hợp Lệ*: Học sinh A (Khối 6, SBD 1) và Học sinh B (Khối 7, SBD 1) cùng tồn tại song song.
   - *Ví dụ Vi Phạm*: Học sinh X (Lớp 6A, SBD 10) và Học sinh Y (Lớp 6B, SBD 10) -> **Trùng SBD Khối 6**.
2. **Định danh bằng `studentId`**: Không bao giờ dùng SBD hay `candidateNumber` làm React key hoặc Document ID trong cơ sở dữ liệu, vì SBD trùng lặp giữa các khối khác nhau.
3. **Hiển thị**: SBD hiển thị thuần con số (1, 2, 3...) không ghép thêm tiền tố "SBD" vào dữ liệu lưu trữ.

### 2.2 Quy Tắc Khoảng Ngày & Slot Xếp Tăng Cường
Dựa trên ca nguồn (`sourceSession`) và ngày nguồn (`sourceDate`):

- **Học xong Ca Sáng (`morning`)**:
  - `minDate` = `sourceDate` (chính ngày học xong ca sáng).
  - `maxDate` = `sourceDate` + 6 ngày (đến hết ngày liền trước cùng thứ của tuần sau).
  - *Slot trong ngày nguồn*: Trong cùng ngày `sourceDate`, chỉ cho phép xếp ca **Chiều (`afternoon`)** hoặc **Tối (`evening`)**. Không được xếp lại ca Sáng cùng ngày.

- **Học xong Ca Chiều (`afternoon`)**:
  - `minDate` = `sourceDate` + 1 ngày (bắt đầu từ ngày hôm sau).
  - `maxDate` = `sourceDate` + 7 ngày (đến hết cùng thứ của tuần sau).
  - *Slot trong ngày nguồn*: **Không** được phép xếp bất kỳ ca nào trong cùng ngày `sourceDate`.

### 2.3 Quy Tắc Lưu Trữ Tự Động (Archive) Sau 22:00
- Danh sách tăng cường của **chính ngày hiện tại** sẽ chuyển trạng thái lưu trữ (archive) nếu thời điểm mở ứng dụng / truy vấn từ **22:00 trở đi**.
- Lịch sử được giữ lại nguyên vẹn cho các báo cáo thống kê, không xóa vĩnh viễn dữ liệu.
- Các ngày trong tương lai giữ nguyên trạng thái `scheduled`.

---

## 3. TRẠNG THÁI TÍCH HỢP HỆ THỐNG
- **Firebase / Firestore**: Chưa kết nối ở giai đoạn này. Dữ liệu được cung cấp bởi tầng mock data (`src/mocks/`).
- **Xác thực dữ liệu**: Hàm `validateMockAcademicData()` kiểm tra tính toàn vẹn của toàn bộ dữ liệu mẫu trong quá trình phát triển (development mode).
