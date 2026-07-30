import { useState, useEffect, useCallback, useRef } from "react";
import { UserProfile } from "../../types/user";
import { TeacherProfile, TeacherStatus } from "../../types/teacher";
import {
  getAllTeachers,
  updateTeacherStatus,
  updateTeacherDisplayName,
  createTeacherAccount,
  CreateTeacherParams,
} from "../../services/teacherService";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { TeacherList } from "./TeacherList";
import { AddTeacherModal } from "./AddTeacherModal";
import { EditTeacherModal } from "./EditTeacherModal";
import { ConfirmStatusModal } from "./ConfirmStatusModal";
import { useToast } from "../../hooks/useToast";
import { upsertById } from "../../utils/stateHelpers";

export interface TeachersPageProps {
  currentUser: UserProfile;
  teachers?: TeacherProfile[];
  onTeachersChange?: React.Dispatch<React.SetStateAction<TeacherProfile[]>>;
  onReloadTeachers?: () => Promise<void>;
  onCreateTeacher?: (params: CreateTeacherParams) => Promise<TeacherProfile>;
}

export function TeachersPage({
  currentUser,
  teachers,
  onTeachersChange,
  onReloadTeachers,
  onCreateTeacher,
}: TeachersPageProps) {
  const { showToast } = useToast();

  const [teacherList, setTeacherList] = useState<TeacherProfile[]>(teachers || []);
  const [loading, setLoading] = useState<boolean>(!teachers || teachers.length === 0);
  const [loadError, setLoadError] = useState<boolean>(false);

  // Set UIDs đang thực hiện cập nhật để disable nút & chống double click
  const [updatingUids, setUpdatingUids] = useState<Set<string>>(new Set());
  const updatingUidsRef = useRef<Set<string>>(new Set());

  const [statusFilter, setStatusFilter] = useState<TeacherStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // State cho Modal Sửa tên giáo viên
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // State cho Modal Xác nhận Đổi trạng thái (Vô hiệu hóa / Kích hoạt lại)
  const [confirmingTeacher, setConfirmingTeacher] = useState<TeacherProfile | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<TeacherStatus | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getAllTeachers();
      setTeacherList(data);
      if (onTeachersChange) {
        onTeachersChange(data);
      }
    } catch (err) {
      console.error("[TeachersPage] Error loading teachers:", err);
      setTeacherList([]);
      setLoadError(true);
      showToast(
        "Không thể tải danh sách giáo viên. Vui lòng kiểm tra Firestore Rules.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [onTeachersChange, showToast]);

  useEffect(() => {
    if (!teachers || teachers.length === 0) {
      loadTeachers();
    } else {
      setTeacherList(teachers);
      setLoading(false);
    }
  }, []);

  // Mở modal sửa thông tin giáo viên
  const handleOpenEditModal = (teacher: TeacherProfile) => {
    if (teacher.role === "admin") {
      showToast("Không thể thay đổi tài khoản Quản trị viên.", "error");
      return;
    }
    setEditingTeacher(teacher);
    setIsEditModalOpen(true);
  };

  // Submit sửa tên giáo viên
  const handleEditNameSubmit = async (uid: string, newDisplayName: string) => {
    if (!currentUser || currentUser.role !== "admin") {
      showToast("Bạn không có quyền thực hiện thao tác này.", "error");
      return;
    }

    if (editingTeacher && editingTeacher.role === "admin") {
      throw new Error("Không thể thay đổi tài khoản Quản trị viên.");
    }

    if (updatingUidsRef.current.has(uid)) {
      return; // Chống double click
    }

    updatingUidsRef.current.add(uid);
    setUpdatingUids(new Set(updatingUidsRef.current));

    try {
      await updateTeacherDisplayName(uid, newDisplayName, currentUser.id);
      const nowIso = new Date().toISOString();

      // Cập nhật local state trực tiếp (1 Write, 0 Read bổ sung)
      setTeacherList((prev) =>
        prev.map((t) => (t.uid === uid ? { ...t, displayName: newDisplayName, updatedAt: nowIso } : t))
      );
      if (onTeachersChange) {
        onTeachersChange((prev) =>
          prev.map((t) => (t.uid === uid ? { ...t, displayName: newDisplayName, updatedAt: nowIso } : t))
        );
      }

      showToast("Cập nhật tên giáo viên thành công.", "success");
    } catch (err: any) {
      console.error("[TeachersPage] Lỗi cập nhật tên giáo viên (uid:", uid, "):", err);
      throw err;
    } finally {
      updatingUidsRef.current.delete(uid);
      setUpdatingUids(new Set(updatingUidsRef.current));
    }
  };

  // Yêu cầu đổi trạng thái (Mở modal xác nhận)
  const handleStatusChangeRequest = (
    teacher: TeacherProfile,
    targetStatus: TeacherStatus
  ) => {
    if (teacher.role === "admin") {
      showToast("Không thể thay đổi tài khoản Quản trị viên.", "error");
      return;
    }
    setConfirmingTeacher(teacher);
    setConfirmingStatus(targetStatus);
    setIsConfirmModalOpen(true);
  };

  // Xác nhận đổi trạng thái
  const handleStatusConfirm = async (uid: string, nextStatus: TeacherStatus) => {
    if (!currentUser || currentUser.role !== "admin") {
      showToast("Bạn không có quyền thực hiện thao tác này.", "error");
      return;
    }

    if (confirmingTeacher && confirmingTeacher.role === "admin") {
      throw new Error("Không thể thay đổi tài khoản Quản trị viên.");
    }

    if (updatingUidsRef.current.has(uid)) {
      return; // Chống double click
    }

    updatingUidsRef.current.add(uid);
    setUpdatingUids(new Set(updatingUidsRef.current));

    try {
      await updateTeacherStatus(uid, nextStatus, currentUser.id);
      const nowIso = new Date().toISOString();

      // Cập nhật local state trực tiếp (1 Write, 0 Read bổ sung)
      setTeacherList((prev) =>
        prev.map((t) => (t.uid === uid ? { ...t, status: nextStatus, updatedAt: nowIso } : t))
      );
      if (onTeachersChange) {
        onTeachersChange((prev) =>
          prev.map((t) => (t.uid === uid ? { ...t, status: nextStatus, updatedAt: nowIso } : t))
        );
      }

      const targetLabel =
        nextStatus === "active"
          ? "Đã kích hoạt lại tài khoản giáo viên."
          : "Đã vô hiệu hóa tài khoản giáo viên.";
      showToast(targetLabel, "success");
    } catch (err: any) {
      console.error(
        "[TeachersPage] Lỗi cập nhật trạng thái giáo viên (uid:",
        uid,
        "):",
        err
      );
      throw err;
    } finally {
      updatingUidsRef.current.delete(uid);
      setUpdatingUids(new Set(updatingUidsRef.current));
    }
  };

  // Kiểm tra quyền admin
  if (currentUser.role !== "admin") {
    return (
      <div className="p-6">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <div className="text-amber-500 font-bold text-lg mb-2">
            ⚠️ Quyền truy cập bị hạn chế
          </div>
          <p className="text-slate-600 text-sm">
            Bạn không có quyền truy cập chức năng này.
          </p>
        </Card>
      </div>
    );
  }

  // Thống kê dành riêng cho GIÁO VIÊN (không tính tài khoản admin)
  const teacherOnlyList = teacherList.filter((t) => t.role !== "admin");
  const totalTeachers = teacherOnlyList.length;
  const activeCount = teacherOnlyList.filter((t) => t.status === "active").length;
  const pendingCount = teacherOnlyList.filter((t) => t.status === "pending").length;
  const disabledCount = teacherOnlyList.filter((t) => t.status === "disabled").length;

  const stats = [
    {
      label: "Tổng tài khoản giáo viên",
      value: totalTeachers,
      color: "text-slate-800 bg-slate-100 border-slate-200",
    },
    {
      label: "Đang hoạt động",
      value: activeCount,
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      label: "Chờ duyệt",
      value: pendingCount,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      label: "Đã vô hiệu hóa",
      value: disabledCount,
      color: "text-rose-700 bg-rose-50 border-rose-200",
    },
  ];

  // Lọc theo tìm kiếm và trạng thái
  const filteredTeachers = teacherList.filter((t) => {
    // Lọc theo trạng thái
    if (statusFilter !== "all") {
      if (t.role === "admin") {
        if (statusFilter !== "active") return false;
      } else {
        if (t.status !== statusFilter) return false;
      }
    }

    // Lọc theo từ khóa tìm kiếm (tên hoặc email)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = (t.displayName || "").toLowerCase().includes(q);
      const matchEmail = (t.email || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    return true;
  });

  // Quy tắc sắp xếp:
  // 1. Admin đứng đầu
  // 2. Giáo viên active
  // 3. Giáo viên pending
  // 4. Giáo viên disabled
  // 5. Cùng trạng thái sắp theo displayName (vi-VN)
  function getSortPriority(t: TeacherProfile): number {
    if (t.role === "admin") return 0;
    if (t.status === "active") return 1;
    if (t.status === "pending") return 2;
    if (t.status === "disabled") return 3;
    return 4;
  }

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    const priorityA = getSortPriority(a);
    const priorityB = getSortPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    const nameA = a.displayName || a.email || "";
    const nameB = b.displayName || b.email || "";
    return nameA.localeCompare(nameB, "vi");
  });

  const handleAddTeacher = () => {
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = async (params: CreateTeacherParams) => {
    let newTeacher: TeacherProfile;
    if (onCreateTeacher) {
      newTeacher = await onCreateTeacher(params);
    } else {
      newTeacher = await createTeacherAccount(params);
    }
    showToast("Tạo giáo viên thành công.", "success");

    if (newTeacher && newTeacher.uid) {
      setTeacherList((prev) => upsertById(prev, newTeacher, (t) => t.uid));
      if (onTeachersChange) {
        onTeachersChange((prev) => upsertById(prev, newTeacher, (t) => t.uid));
      }
    } else {
      await loadTeachers();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Quản lý giáo viên
          </h2>
          <p className="text-xs text-slate-500 mt-1 hidden md:block">
            Quản lý tài khoản và trạng thái truy cập của giáo viên từ Firestore.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddTeacher}
          className="self-start sm:self-auto font-semibold text-xs"
        >
          + Thêm giáo viên
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {stats.map((s, idx) => (
          <Card key={idx} className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {s.label}
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span
                className={`text-2xl font-extrabold px-2.5 py-0.5 rounded-lg border ${s.color}`}
              >
                {s.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar: Search & Filter */}
      <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input Tìm kiếm */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap mr-1">
            Trạng thái:
          </span>
          {[
            { id: "all", label: "Tất cả" },
            { id: "active", label: "Đang hoạt động" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "disabled", label: "Đã vô hiệu hóa" },
          ].map((item) => {
            const isActive = statusFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id as TeacherStatus | "all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Table / Empty State / Loading */}
      <Card className="overflow-hidden border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 text-sm">
            <svg
              className="animate-spin h-5 w-5 text-teal-600"
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
            <span>Đang tải danh sách giáo viên từ Firestore...</span>
          </div>
        ) : loadError ? (
          <div className="p-8">
            <EmptyState
              title="Không thể tải danh sách giáo viên."
              description="Vui lòng kiểm tra kết nối và quyền truy cập Firestore."
            />
          </div>
        ) : sortedTeachers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không tìm thấy tài khoản giáo viên phù hợp."
              description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."
            />
          </div>
        ) : (
          <TeacherList
            teachers={sortedTeachers}
            onEditTeacher={handleOpenEditModal}
            onStatusChangeRequest={handleStatusChangeRequest}
            updatingUids={updatingUids}
          />
        )}
      </Card>

      {/* Modal Tạo giáo viên mới */}
      <AddTeacherModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      {/* Modal Sửa họ tên giáo viên */}
      <EditTeacherModal
        open={isEditModalOpen}
        teacher={editingTeacher}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeacher(null);
        }}
        onSubmit={handleEditNameSubmit}
      />

      {/* Modal Xác nhận đổi trạng thái */}
      <ConfirmStatusModal
        open={isConfirmModalOpen}
        teacher={confirmingTeacher}
        targetStatus={confirmingStatus}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setConfirmingTeacher(null);
          setConfirmingStatus(null);
        }}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
}

