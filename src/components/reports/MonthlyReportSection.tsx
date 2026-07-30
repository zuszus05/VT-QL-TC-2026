import { useState, useEffect, useMemo } from "react";
import { AttendanceRecord } from "../../types/attendance";
import { ReinforcementScheduleRecord } from "../../types/extraStudy";
import { Student } from "../../types/student";
import { SchoolClass } from "../../types/academic";
import { EmptyState } from "../common/EmptyState";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { useToast } from "../../hooks/useToast";
import { getSessionLabel } from "../../utils/date";
import {
  calculateMonthlyReport,
  MonthlyClassReport,
  MonthlyStudentReport,
} from "../../utils/reportCalculator";

function formatDateShort(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [, m, d] = parts;
    return `${d}/${m}`;
  }
  return isoDate;
}

function formatDateVn(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

function formatMonthVn(monthKey: string): string {
  if (!monthKey) return "";
  const parts = monthKey.split("-");
  if (parts.length === 2) {
    const [y, m] = parts;
    return `${m}/${y}`;
  }
  return monthKey;
}

function formatNowVn(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

const sessionPriority: Record<string, number> = {
  morning: 1,
  afternoon: 2,
  evening: 3,
};

interface MonthlyReportSectionProps {
  attendanceRecords?: AttendanceRecord[];
  reportLoading?: boolean;
  reportError?: string | null;
  onAttendanceRecordsChange?: (records: AttendanceRecord[]) => void;
  onLoadMonthlyReport?: (monthKey: string) => void;
  onUpdateMadeUpStatus?: (
    attendanceId: string,
    isMadeUp: boolean
  ) => Promise<void>;
  madeUpUpdatingIds?: Set<string>;
  madeUpError?: string | null;
  extraStudyRecords?: ReinforcementScheduleRecord[];
  students?: Student[];
  classes?: SchoolClass[];
}

export function MonthlyReportSection({
  attendanceRecords = [],
  reportLoading = false,
  reportError = null,
  onLoadMonthlyReport,
  onUpdateMadeUpStatus,
  madeUpUpdatingIds,
  madeUpError = null,
  students = [],
  classes = [],
}: MonthlyReportSectionProps) {
  const { showToast } = useToast();

  const getCurrentYearMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(
    getCurrentYearMonth()
  );

  useEffect(() => {
    if (onLoadMonthlyReport) {
      onLoadMonthlyReport(selectedMonth);
    }
  }, [selectedMonth, onLoadMonthlyReport]);

  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade);
    setSelectedClassId("all");
  };

  const availableClasses = classes.filter((c) => {
    if (selectedGrade === "all") return true;
    return c.grade === Number(selectedGrade);
  });

  const sortedAvailableClasses = [...availableClasses].sort((a, b) =>
    a.className.localeCompare(b.className)
  );

  // Group raw absent attendanceRecords by studentId and sort
  const studentAbsentRecordsMap = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    for (const rec of attendanceRecords) {
      if (rec.status === "absent") {
        if (!map[rec.studentId]) {
          map[rec.studentId] = [];
        }
        map[rec.studentId].push(rec);
      }
    }
    for (const studentId in map) {
      map[studentId].sort((a, b) => {
        const dateCompare = a.attendanceDate.localeCompare(b.attendanceDate);
        if (dateCompare !== 0) return dateCompare;

        const pA = sessionPriority[a.session] || 99;
        const pB = sessionPriority[b.session] || 99;
        if (pA !== pB) return pA - pB;

        return a.attendanceId.localeCompare(b.attendanceId);
      });
    }
    return map;
  }, [attendanceRecords]);

  // Thống kê báo cáo tháng bằng reportCalculator
  const allClassReports = useMemo<MonthlyClassReport[]>(() => {
    return calculateMonthlyReport({
      attendanceRecords,
      students,
      classes,
    });
  }, [attendanceRecords, students, classes]);

  // Lọc nhóm lớp theo bộ lọc Khối và Lớp
  const filteredClassReports = useMemo<MonthlyClassReport[]>(() => {
    return allClassReports.filter((clsGroup) => {
      if (
        selectedGrade !== "all" &&
        clsGroup.grade !== Number(selectedGrade)
      ) {
        return false;
      }
      if (
        selectedClassId !== "all" &&
        clsGroup.classId !== selectedClassId
      ) {
        return false;
      }
      return true;
    });
  }, [allClassReports, selectedGrade, selectedClassId]);

  // Thống kê tổng hợp phía trên
  const totalSessions = useMemo(() => {
    let sum = 0;
    for (const clsGroup of filteredClassReports) {
      for (const st of clsGroup.students) {
        sum += st.totalSessions;
      }
    }
    return sum;
  }, [filteredClassReports]);

  const totalRawAbsent = useMemo(() => {
    let sum = 0;
    for (const clsGroup of filteredClassReports) {
      sum += clsGroup.totalRawAbsent;
    }
    return sum;
  }, [filteredClassReports]);

  const totalMadeUp = useMemo(() => {
    let sum = 0;
    for (const clsGroup of filteredClassReports) {
      sum += clsGroup.totalMadeUp;
    }
    return sum;
  }, [filteredClassReports]);

  const totalRemainingAbsent = useMemo(() => {
    let sum = 0;
    for (const clsGroup of filteredClassReports) {
      sum += clsGroup.totalRemainingAbsent;
    }
    return sum;
  }, [filteredClassReports]);

  const totalLate = useMemo(() => {
    let sum = 0;
    for (const clsGroup of filteredClassReports) {
      sum += clsGroup.totalLate;
    }
    return sum;
  }, [filteredClassReports]);

  const stats = [
    {
      label: "Tổng lượt học",
      value: totalSessions,
      color: "text-slate-800 bg-slate-100 border-slate-200",
    },
    {
      label: "Vắng ban đầu",
      value: totalRawAbsent,
      color: "text-slate-700 bg-slate-50 border-slate-200",
    },
    {
      label: "Đã học bù",
      value: totalMadeUp,
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      label: "Vắng còn lại",
      value: totalRemainingAbsent,
      color: "text-rose-600 bg-rose-50 border-rose-200",
    },
    {
      label: "Đi muộn",
      value: totalLate,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
  ];

  // Xuất file Excel (.xlsx) dựa trên kết quả đã tính toán
  const handleExportExcel = async () => {
    if (isExporting) return;
    if (reportLoading || reportError) return;
    if (filteredClassReports.length === 0) {
      showToast("Không có dữ liệu để xuất.", "warning");
      return;
    }

    setIsExporting(true);

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const exportTime = formatNowVn();
      const monthLabel = formatMonthVn(selectedMonth);

      // 1. Sheet "Tổng hợp"
      const summaryRows: (string | number)[][] = [
        ["BÁO CÁO ĐIỂM DANH TĂNG CƯỜNG"],
        [`Tháng: ${monthLabel}`],
        [`Thời điểm xuất: ${exportTime}`],
        [],
        [
          "STT",
          "Lớp",
          "Số học sinh có vắng hoặc muộn",
          "Tổng lượt học",
          "Vắng ban đầu",
          "Đã học bù",
          "Vắng còn lại",
          "Muộn",
        ],
      ];

      let sumStudentCount = 0;
      let sumTotalSessions = 0;
      let sumRawAbsent = 0;
      let sumMadeUp = 0;
      let sumRemainingAbsent = 0;
      let sumLate = 0;

      filteredClassReports.forEach((cls, idx) => {
        const studentCount = cls.students.length;
        const totalSessionsSum = cls.students.reduce(
          (acc, s) => acc + s.totalSessions,
          0
        );

        sumStudentCount += studentCount;
        sumTotalSessions += totalSessionsSum;
        sumRawAbsent += cls.totalRawAbsent;
        sumMadeUp += cls.totalMadeUp;
        sumRemainingAbsent += cls.totalRemainingAbsent;
        sumLate += cls.totalLate;

        summaryRows.push([
          idx + 1,
          cls.className,
          studentCount,
          totalSessionsSum,
          cls.totalRawAbsent,
          cls.totalMadeUp,
          cls.totalRemainingAbsent,
          cls.totalLate,
        ]);
      });

      // Dòng TỔNG CỘNG
      summaryRows.push([
        "",
        "TỔNG CỘNG",
        sumStudentCount,
        sumTotalSessions,
        sumRawAbsent,
        sumMadeUp,
        sumRemainingAbsent,
        sumLate,
      ]);

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = [
        { wch: 8 },
        { wch: 12 },
        { wch: 30 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng hợp");

      // 2. Sheet từng lớp
      const usedSheetNames = new Set<string>(["Tổng hợp"]);

      filteredClassReports.forEach((cls) => {
        if (cls.students.length === 0) return;

        const classRows: (string | number)[][] = [
          ["BÁO CÁO ĐIỂM DANH TĂNG CƯỜNG"],
          [`Lớp: ${cls.className}`],
          [`Tháng: ${monthLabel}`],
          [`Thời điểm xuất: ${exportTime}`],
          [],
          [
            "STT",
            "SBD",
            "Họ và tên",
            "Vắng ban đầu",
            "Đã học bù",
            "Vắng còn lại",
            "Muộn",
            "Chi tiết các lần vắng",
          ],
        ];

        cls.students.forEach((st: MonthlyStudentReport, stIdx: number) => {
          const studentAbsents = studentAbsentRecordsMap[st.studentId] || [];
          const absentDetails = studentAbsents
            .map((rec) => {
              const dStr = formatDateVn(rec.attendanceDate);
              const sStr = getSessionLabel(rec.session as any);
              const statusStr = rec.isMadeUp ? "Đã học bù" : "Chưa học bù";
              return `${dStr} - ${sStr} - ${statusStr}`;
            })
            .join("\n");

          const candNum =
            typeof st.candidateNumber === "number"
              ? st.candidateNumber
              : Number(st.candidateNumber) || st.candidateNumber;

          classRows.push([
            stIdx + 1,
            candNum,
            st.fullName,
            st.rawAbsentCount,
            st.madeUpCount,
            st.remainingAbsentCount,
            st.lateCount,
            absentDetails,
          ]);
        });

        const classSheet = XLSX.utils.aoa_to_sheet(classRows);
        classSheet["!cols"] = [
          { wch: 8 },
          { wch: 10 },
          { wch: 24 },
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 10 },
          { wch: 42 },
        ];

        let baseSheetName = cls.className.replace(/[:\\/?*\[\]]/g, "_").trim();
        if (!baseSheetName) baseSheetName = "Lop";
        baseSheetName = baseSheetName.substring(0, 31);

        let finalSheetName = baseSheetName;
        let suffix = 2;
        while (usedSheetNames.has(finalSheetName)) {
          const sufStr = `-${suffix}`;
          const maxBaseLen = 31 - sufStr.length;
          finalSheetName = `${baseSheetName.substring(0, maxBaseLen)}${sufStr}`;
          suffix++;
        }
        usedSheetNames.add(finalSheetName);

        XLSX.utils.book_append_sheet(workbook, classSheet, finalSheetName);
      });

      XLSX.writeFile(
        workbook,
        `Bao-cao-diem-danh-tang-cuong-${selectedMonth}.xlsx`
      );
      showToast("Đã xuất báo cáo Excel.", "success");
    } catch (error) {
      console.error("Lỗi xuất báo cáo Excel:", error);
      showToast("Không thể xuất báo cáo Excel.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Báo cáo tháng</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp tình hình tham gia học tập theo tháng
          </p>
        </div>

        {/* Thanh chọn Tháng, Khối, Lớp & Nút Xuất Excel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Chọn tháng */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="month-picker"
              className="text-xs font-semibold text-slate-600 whitespace-nowrap"
            >
              Chọn tháng:
            </label>
            <input
              id="month-picker"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
            />
          </div>

          {/* Bộ lọc Khối */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="grade-filter"
              className="text-xs font-semibold text-slate-600 whitespace-nowrap"
            >
              Khối:
            </label>
            <select
              id="grade-filter"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">Tất cả khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          {/* Bộ lọc Lớp */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="class-filter"
              className="text-xs font-semibold text-slate-600 whitespace-nowrap"
            >
              Lớp:
            </label>
            <select
              id="class-filter"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">Tất cả lớp</option>
              {sortedAvailableClasses.map((c) => (
                <option key={c.classId} value={c.classId}>
                  Lớp {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Nút Xuất Excel */}
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={
              isExporting ||
              reportLoading ||
              !!reportError ||
              filteredClassReports.length === 0
            }
            className="text-xs font-bold border-teal-200 text-teal-800 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "⏳ Đang xuất..." : "📊 Xuất Excel"}
          </Button>
        </div>
      </div>

      {madeUpError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span>{madeUpError}</span>
        </div>
      )}

      {reportLoading ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="text-sm font-medium text-slate-600">
            Đang tải dữ liệu báo cáo...
          </p>
        </Card>
      ) : reportError ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center space-y-3 border-rose-200 bg-rose-50/50">
          <p className="text-sm font-semibold text-rose-700">
            Không thể tải dữ liệu báo cáo.
          </p>
          <Button
            variant="secondary"
            onClick={() => onLoadMonthlyReport?.(selectedMonth)}
            className="text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            Thử lại
          </Button>
        </Card>
      ) : (
        <>
          {/* 3 Thẻ thống kê */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {stats.map((item, idx) => (
              <Card key={idx} className="p-4 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {item.label}
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-extrabold px-2.5 py-0.5 rounded-lg border ${item.color}`}
                  >
                    {item.value}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Bảng chi tiết học sinh trong tháng */}
          {attendanceRecords.length === 0 ? (
            <Card className="p-6">
              <EmptyState title="Không có dữ liệu điểm danh trong khoảng đã chọn." />
            </Card>
          ) : filteredClassReports.length === 0 ? (
            <Card className="p-6">
              <EmptyState title="Không có học sinh vắng hoặc đi muộn trong tháng đã chọn." />
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredClassReports.map((clsGroup) => (
                <div
                  key={clsGroup.classId || clsGroup.className}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs p-4 space-y-3"
                >
                  {/* Header Lớp */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center font-extrabold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        K{clsGroup.grade}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Lớp {clsGroup.className}
                      </h3>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {clsGroup.students.length} học sinh
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                        Vắng ban đầu: {clsGroup.totalRawAbsent}
                      </span>
                      <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg">
                        Đã học bù: {clsGroup.totalMadeUp}
                      </span>
                      <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg">
                        Vắng còn lại: {clsGroup.totalRemainingAbsent}
                      </span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                        Tổng muộn: {clsGroup.totalLate}
                      </span>
                    </div>
                  </div>

                  {/* Bảng/Danh sách học sinh */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {clsGroup.students.map((st) => (
                      <div
                        key={st.studentId}
                        className="p-3 bg-white hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Thông tin học sinh */}
                        <div className="flex flex-wrap items-center gap-2.5 min-w-[280px]">
                          <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                            {st.className}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {st.candidateNumber} — {st.shortName}
                          </span>
                          <div className="flex items-center gap-1.5 ml-1 text-slate-600 flex-wrap">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                              Tổng lượt: <strong>{st.totalSessions}</strong>
                            </span>
                            <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded text-[11px] font-semibold">
                              Vắng ban đầu: {st.rawAbsentCount}
                            </span>
                            <span className="bg-teal-50 text-teal-800 border border-teal-200/80 px-2 py-0.5 rounded text-[11px] font-bold">
                              Đã học bù: {st.madeUpCount}
                            </span>
                            <span className="bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded text-[11px] font-bold">
                              Vắng còn lại: {st.remainingAbsentCount}
                            </span>
                            <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded text-[11px] font-bold">
                              Muộn: {st.lateCount}
                            </span>
                          </div>
                        </div>

                        {/* Cột các buổi vắng & Checkbox Học bù */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">
                            Các buổi vắng:
                          </span>
                          {(() => {
                            const studentAbsentRecords =
                              studentAbsentRecordsMap[st.studentId] || [];
                            if (studentAbsentRecords.length === 0) {
                              return (
                                <span className="text-slate-400 italic">
                                  Không có
                                </span>
                              );
                            }
                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                {studentAbsentRecords.map((rec) => {
                                  const isUpdating =
                                    madeUpUpdatingIds?.has(
                                      rec.attendanceId
                                    ) ?? false;
                                  const isMadeUp = rec.isMadeUp === true;

                                  return (
                                    <div
                                      key={rec.attendanceId}
                                      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                                        isMadeUp
                                          ? "bg-teal-50/80 border-teal-200 text-teal-900"
                                          : "bg-rose-50/80 border-rose-200 text-rose-900"
                                      }`}
                                    >
                                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none touch-choice-label">
                                        <input
                                          type="checkbox"
                                          checked={isMadeUp}
                                          disabled={isUpdating}
                                          onChange={(e) => {
                                            if (isUpdating) return;
                                            if (onUpdateMadeUpStatus) {
                                              onUpdateMadeUpStatus(
                                                rec.attendanceId,
                                                e.target.checked
                                              );
                                            }
                                          }}
                                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 disabled:opacity-50 cursor-pointer"
                                        />
                                        <span className="font-semibold">
                                          {formatDateVn(rec.attendanceDate)} –{" "}
                                          {getSessionLabel(rec.session)}
                                        </span>
                                      </label>

                                      {isUpdating && (
                                        <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                                          Đang lưu...
                                        </span>
                                      )}

                                      {!isUpdating && isMadeUp && (
                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded border border-teal-300/60">
                                          Đã học bù
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
