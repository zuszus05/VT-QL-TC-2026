# BÁO CÁO RÀ SOÁT SỬ DỤNG FIRESTORE QUOTA (13B1)

**Ngày thực hiện:** 29/07/2026  
**Dự án:** Quản lý Tăng cường Học sinh  
**Mục đích:** Kiểm kê toàn bộ luồng sử dụng Firestore SDK, phục vụ tối ưu số lượng Read/Write Quota ở bước 13B2.

---

## 1. KIỂM KÊ TOÀN BỘ THAO TÁC FIRESTORE

Bảng dưới đây thống kê tất cả các lời gọi hàm Firestore SDK trong mã nguồn dự án (tại các service và component):

| STT | File | Hàm | Collection | Loại thao tác | Mô tả chi tiết |
|:---:|:---|:---|:---|:---|:---|
| 1 | `services/teacherProfileService.ts` | `getTeacherProfile` | `teachers` | Read (1 doc) | `getDoc(doc(db, "teachers", uid))` lấy thông tin profile người dùng khi đăng nhập. |
| 2 | `services/teacherService.ts` | `createTeacherAccount` | `teachers` | Write (1 setDoc) | `setDoc(doc(db, "teachers", uid), {...})` ghi hồ sơ giáo viên mới sau khi tạo Auth. |
| 3 | `services/teacherService.ts` | `getAllTeachers` | `teachers` | Read (All docs) | `getDocs(query(collection(db, "teachers"), orderBy("createdAt", "desc")))` lấy tất cả giáo viên. |
| 4 | `services/teacherService.ts` | `getTeacher` | `teachers` | Read (1 doc) | `getDoc(doc(db, "teachers", uid))` lấy profile 1 giáo viên. |
| 5 | `services/teacherService.ts` | `updateTeacherDisplayName` | `teachers` | Write (1 updateDoc) | `updateDoc(docRef, { displayName, ... })` cập nhật tên giáo viên. |
| 6 | `services/teacherService.ts` | `updateTeacherStatus` | `teachers` | Write (1 updateDoc) | `updateDoc(docRef, { status, ... })` khoá/kích hoạt tài khoản giáo viên. |
| 7 | `services/studentService.ts` | `getAllStudents` | `students` | Read (All docs) | `getDocs(collection(db, "students"))` đọc toàn bộ danh sách học sinh. |
| 8 | `services/studentService.ts` | `createStudent` | `students` | Write (1 setDoc) | `setDoc(docRef, payload)` tạo mới 1 học sinh. |
| 9 | `services/studentService.ts` | `updateStudent` | `students` | Write (1 updateDoc) | `updateDoc(docRef, updatePayload)` sửa thông tin 1 học sinh. |
| 10 | `services/studentService.ts` | `deleteStudent` | `students` | Delete (1 deleteDoc) | `deleteDoc(docRef)` xóa 1 học sinh. |
| 11 | `services/classService.ts` | `getAllClasses` | `classes` | Read (All docs) | `getDocs(collection(db, "classes"))` đọc toàn bộ danh sách lớp học. |
| 12 | `services/classService.ts` | `createClass` | `classes` | Write (1 setDoc) | `setDoc(docRef, payload)` tạo mới 1 lớp học. |
| 13 | `services/classService.ts` | `updateClass` | `classes` | Write (1 updateDoc) | `updateDoc(docRef, updatePayload)` cập nhật tên/khối lớp. |
| 14 | `services/classService.ts` | `deleteClass` | `classes` | Delete (1 deleteDoc) | `deleteDoc(docRef)` xóa 1 lớp học. |
| 15 | `services/extraStudyService.ts` | `loadExtraStudyRecords` | `extraStudyRecords` | Read (All docs) | `getDocs(collection(db, "extraStudyRecords"))` nạp toàn bộ lịch học tăng cường. |
| 16 | `services/extraStudyService.ts` | `createExtraStudyRecords` | `extraStudyRecords` | Batch Write | `writeBatch(db)` ghi danh sách lịch tăng cường mới theo batch (max 400 docs/batch). |
| 17 | `services/extraStudyService.ts` | `deleteExtraStudyRecord` | `extraStudyRecords` | Delete (1 deleteDoc) | `deleteDoc(docRef)` xóa 1 lịch tăng cường. |
| 18 | `services/extraStudyService.ts` | `updateExtraStudySchedule` | `extraStudyRecords` | Write (1 updateDoc) | `updateDoc(docRef, {...})` đổi ngày/thứ/ca học tăng cường. |
| 19 | `services/extraStudyService.ts` | `archiveExtraStudyRecords` | `extraStudyRecords` | Batch Write | `writeBatch(db)` cập nhật trạng thái `archived` cho danh sách lịch. |
| 20 | `services/studentImportService.ts` | `importStudentsFromExcel` | `students` | Read (All) + Batch Write | `getDocs(collection(db, "students"))` đọc tất cả để đối soát, sau đó dùng `writeBatch` tạo/sửa. |
| 21 | `services/attendanceService.ts` | `loadAttendanceRecords` | `attendanceRecords` | Read (Filtered) | `getDocs(query(..., where("attendanceDate"), where("session")))` đọc theo ngày & ca. |
| 22 | `services/attendanceService.ts` | `saveAttendanceRecords` | `attendanceRecords` | Batch Write | `writeBatch(db)` lưu danh sách điểm danh (set merge: true). |
| 23 | `services/attendanceService.ts` | `finalizeAttendanceRecords` | `attendanceRecords` | Batch Write | `writeBatch(db)` chốt vắng hàng loạt. |
| 24 | `services/attendanceService.ts` | `markAttendanceLate` | `attendanceRecords` | Write (1 updateDoc) | `updateDoc(docRef, { status: "late", ... })` đánh dấu muộn. |
| 25 | `services/attendanceService.ts` | `updateAttendanceMadeUpStatus` | `attendanceRecords` | Write (1 updateDoc) | `updateDoc(docRef, { isMadeUp, ... })` đánh dấu học bù. |
| 26 | `services/attendanceService.ts` | `loadAttendanceRecordsByDate` | `attendanceRecords` | Read (Filtered) | `getDocs(query(..., where("attendanceDate", "==", date)))` nạp điểm danh cả ngày. |
| 27 | `services/attendanceService.ts` | `loadAttendanceRecordsByMonth` | `attendanceRecords` | Read (Filtered) | `getDocs(query(..., where("attendanceDate", ">=", start), where("<", end)))` nạp điểm danh tháng. |

---

## 2. THỐNG KÊ COLLECTION

Hệ thống đang quản lý tổng cộng **5 Collections** trên Firestore:

1. `teachers`: Hồ sơ tài khoản giáo viên & ban quản lý (vai trò, trạng thái, ngày tạo, tên hiển thị).
2. `students`: Danh sách học sinh (SBD, họ tên, trường, SĐT bố/mẹ, classId, khối, trạng thái).
3. `classes`: Danh sách lớp học (tên lớp, khối 6-9, trạng thái).
4. `extraStudyRecords`: Lịch học tăng cường / bổ trợ (studentId, môn học, ngày học, ca học, trạng thái).
5. `attendanceRecords`: Bản ghi điểm danh (extraStudyId, studentId, ngày điểm danh, ca học, trạng thái, ghi chú, chốt vắng, học bù).

---

## 3. PHÂN TÍCH THEO MODULE

### 3.1. Đăng nhập & Profile (`authService`, `teacherProfileService`)
- **Đọc Firestore:** Gọi `getTeacherProfile(uid)` đọc 1 document duy nhất trong collection `teachers` khi đăng nhập thành công.
- **Ghi Firestore:** Không ghi trong luồng đăng nhập thông thường.
- **Đọc lại sau ghi:** Không.
- **Tải toàn bộ:** Không.

### 3.2. Quản lý Học sinh (`studentService`, `studentImportService`)
- **Đọc Firestore:** 
  - `getAllStudents`: Nạp toàn bộ collection `students` lúc khởi chạy ứng dụng.
  - `importStudentsFromExcel`: Nạp toàn bộ collection `students` để đối soát `grade_candidateNumber`.
- **Ghi Firestore:** 
  - `createStudent` (1 setDoc), `updateStudent` (1 updateDoc), `deleteStudent` (1 deleteDoc).
  - `importStudentsFromExcel`: Viết theo lô (`writeBatch`).
- **Đọc lại sau ghi:** Không đọc lại Firestore nữa (đã hoàn thiện cập nhật local state an toàn ở bước 13A2-Fix).
- **Tải toàn bộ:** Có, `getAllStudents()` và `importStudentsFromExcel()` nạp toàn bộ danh sách học sinh.

### 3.3. Quản lý Lớp học (`classService`)
- **Đọc Firestore:** `getAllClasses` đọc toàn bộ collection `classes` ở App start.
- **Ghi Firestore:** `createClass` (1 setDoc), `updateClass` (1 updateDoc), `deleteClass` (1 deleteDoc).
- **Đọc lại sau ghi:** Không. Local state cập nhật bằng functional updater.
- **Tải toàn bộ:** Có, tải toàn bộ collection `classes`.

### 3.4. Danh sách Tăng cường (`extraStudyService`)
- **Đọc Firestore:** `loadExtraStudyRecords` tải toàn bộ collection `extraStudyRecords` khi khởi động App.
- **Ghi Firestore:** `createExtraStudyRecords` (Batch Write), `updateExtraStudySchedule` (1 updateDoc), `archiveExtraStudyRecords` (Batch Write), `deleteExtraStudyRecord` (1 deleteDoc).
- **Đọc lại sau ghi:** Không. Dùng local state functional updater.
- **Tải toàn bộ:** Có, tải toàn bộ collection `extraStudyRecords`.

### 3.5. Điểm danh (`attendanceService`)
- **Đọc Firestore:** `loadAttendanceRecordsByDate` (nạp các bản ghi điểm danh trong ngày hôm nay ở App start).
- **Ghi Firestore:** `saveAttendanceRecords` (Batch Write), `finalizeAttendanceRecords` (Batch Write), `markAttendanceLate` (1 updateDoc), `updateAttendanceMadeUpStatus` (1 updateDoc).
- **Đọc lại sau ghi:** Không. Trạng thái trong ngày được cập nhật trực tiếp vào local state `todayAttendanceRecords`.
- **Tải toàn bộ:** Không. Đọc có điều kiện lọc theo ngày (`attendanceDate`) và ca (`session`).

### 3.6. Báo cáo (`reports`)
- **Đọc Firestore:**
  - Báo cáo ngày: `loadAttendanceRecordsByDate` lọc theo ngày được chọn (`attendanceDate == date`).
  - Báo cáo tháng: `loadAttendanceRecordsByMonth` lọc theo khoảng ngày trong tháng (`>= YYYY-MM-01` và `< YYYY-nextMM-01`).
- **Ghi Firestore:** Cập nhật trạng thái học bù (`updateAttendanceMadeUpStatus`).
- **Đọc lại sau ghi:** Không.
- **Tải toàn bộ:** Không. Đọc có điều kiện lọc theo ngày/tháng.

### 3.7. Quản lý Giáo viên (`teacherService`)
- **Đọc Firestore:** `getAllTeachers` tải toàn bộ collection `teachers` khi Admin đăng nhập hoặc mở trang Giáo viên.
- **Ghi Firestore:** `createTeacherAccount` (1 setDoc), `updateTeacherDisplayName` (1 updateDoc), `updateTeacherStatus` (1 updateDoc).
- **Đọc lại sau ghi:** Không.
- **Tải toàn bộ:** Có, tải toàn bộ collection `teachers`.

---

## 4. KIỂM TRA ĐỌC TRÙNG (DUPLICATE READ AUDIT)

Sau khi kiểm tra dòng đời dữ liệu và Effect trong toàn bộ ứng dụng, ghi nhận các điểm phát sinh đọc trùng hoặc có thể tối ưu thêm:

1. **Chuyển Tab / Chọn Ngày Báo Cáo:**
   - Khi người dùng đổi ngày ở `TodayReportSection` hoặc đổi tháng ở `MonthlyReportSection`, mỗi lần đổi giá trị sẽ kích hoạt `useEffect` thực hiện 1 truy vấn Firestore (`loadAttendanceRecordsByDate` hoặc `loadAttendanceRecordsByMonth`). Nếu người dùng chuyển qua lại giữa các ngày/tháng đã xem, dữ liệu vẫn bị truy vấn lại từ Firestore.
2. **Import Excel Học Sinh:**
   - Trước khi ghi batch, `importStudentsFromExcel` đọc lại toàn bộ collection `students` để xây dựng Map trùng lặp, mặc dù App đã giữ danh sách `students` trong local state.
3. **Chuyển Ca / Ngày Điểm Danh (`AttendancePage`):**
   - Khi đổi xem điểm danh giữa các ngày hoặc ca học, `onViewChange` kích hoạt đọc `attendanceRecords` mới từ Firestore.
4. **Khởi tạo trang Giáo viên (`TeachersPage`):**
   - Nếu prop `teachers` truyền từ `App` bị rỗng (ví dụ chưa kịp load xong), `TeachersPage` sẽ thực hiện lại `loadTeachers()`.

---

## 5. KIỂM TRA REALTIME (LISTENER AUDIT)

Xác nhận kiểm tra mã nguồn:
- **`onSnapshot`:** Không có bất kỳ hàm `onSnapshot` nào trong toàn bộ dự án.
- **Active Listener:** Số lượng listener = **0**.
- **Kết luận:** Dự án chạy hoàn toàn theo cơ chế On-Demand Fetch (đọc khi cần), không tiêu tốn Read Quota từ kết nối realtime ngầm.

---

## 6. ĐÁNH GIÁ MỨC ĐỘ RỦI RO QUOTA

- **P0 (Rủi ro rất cao / Cực kỳ tốn Quota):** Không có. Không có vòng lặp vô hạn hay listener ngầm.
- **P1 (Rủi ro cao):**
  - `importStudentsFromExcel` thực hiện `getDocs` toàn bộ collection `students` mỗi lần import file, gây thừa 1 lượt Read toàn collection khi local state đã có sẵn.
  - `loadExtraStudyRecords` nạp toàn bộ collection `extraStudyRecords` mà chưa lọc bỏ các bản ghi đã quá cũ hoặc đã bị lưu trữ (`archived`).
- **P2 (Trung bình):**
  - Truy vấn Báo cáo Tháng (`loadAttendanceRecordsByMonth`) và Báo cáo Ngày (`loadAttendanceRecordsByDate`) chưa có bộ nhớ tạm (cache in-memory) nên khi người dùng chuyển lại tháng/ngày vừa xem sẽ thực hiện lại truy vấn Firestore.
- **P3 (Thấp):**
  - `getAllClasses`, `getAllStudents`, `getAllTeachers` tải toàn bộ collection khi App start. Do quy mô trường học/trung tâm dữ liệu danh mục nhỏ (vài chục đến vài trăm record), đây là chi phí chấp nhận được nhưng có thể tối ưu giữ nguyên trong React State.

---

## 7. ĐỀ XUẤT CHO BƯỚC 13B2

1. **13B2-01: Tối ưu Import Excel không đọc lại Firestore**
   - **Vấn đề:** `importStudentsFromExcel` gọi `getDocs(collection(db, "students"))` để làm bản đồ đối soát.
   - **File liên quan:** `src/services/studentImportService.ts`, `src/components/students/StudentsPage.tsx`
   - **Hướng tối ưu:** Truyền danh sách `existingStudents` từ local state hiện có vào hàm import thay vì gọi `getDocs`.

2. **13B2-02: Bộ nhớ tạm (Cache in-memory) cho Báo cáo Ngày & Tháng**
   - **Vấn đề:** Đổi ngày/tháng báo cáo kích hoạt lại truy vấn Firestore dù cùng ngày/tháng đã tải trước đó trong phiên làm việc.
   - **File liên quan:** `src/App.tsx`, `src/components/reports/MonthlyReportSection.tsx`, `src/components/reports/TodayReportSection.tsx`
   - **Hướng tối ưu:** Lưu trữ kết quả các ngày/tháng đã tải vào Map/Cache local trong `App.tsx` hoặc Service.

3. **13B2-03: Giới hạn/Lọc lịch tăng cường cũ hoặc lưu trữ**
   - **Vấn đề:** `loadExtraStudyRecords` lấy toàn bộ collection `extraStudyRecords`.
   - **File liên quan:** `src/services/extraStudyService.ts`
   - **Hướng tối ưu:** Đảm bảo truy vấn không cần thiết bị loại bỏ hoặc thêm cờ lọc nếu collection phình to.

---

## THỐNG KÊ TỔNG HỢP

- **Số collection:** 5 (`teachers`, `students`, `classes`, `extraStudyRecords`, `attendanceRecords`)
- **Số hàm dịch vụ Firestore:** 25 hàm
- **Sử dụng onSnapshot:** Khẳng định **KHÔNG** (0 listener)
- **Sử dụng WriteBatch:** **CÓ** (dùng ở 5 dịch vụ: `createExtraStudyRecords`, `archiveExtraStudyRecords`, `importStudentsFromExcel`, `saveAttendanceRecords`, `finalizeAttendanceRecords`)
- **Sử dụng Transaction:** **KHÔNG** (0 transaction)
- **Số lượng vấn đề phát hiện:**
  - **P0:** 0
  - **P1:** 2 (`importStudentsFromExcel` đọc thừa, `extraStudyRecords` nạp toàn bộ)
  - **P2:** 1 (Thiếu cache báo cáo ngày/tháng)
  - **P3:** 1 (Tải toàn bộ danh mục học sinh/lớp/giáo viên ban đầu)

---
*Xác nhận: Không sửa mã nguồn ứng dụng, không sửa Firestore Rules, chỉ lập tài liệu FIRESTORE_QUOTA_AUDIT.md. Chưa thực hiện bước 13B2.*
