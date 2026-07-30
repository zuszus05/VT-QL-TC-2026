import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useToast } from "../../hooks/useToast";
import { Student } from "../../types/student";
import { ExcelValidationResult, ValidatedSheet } from "../../utils/excelValidator";
import {
  importStudentsFromExcel,
  StudentImportItem,
  StudentImportResult,
  ExcelImportMode,
} from "../../services/studentImportService";

export interface ExcelValidationModalProps {
  open: boolean;
  validationResult: ExcelValidationResult | null;
  existingStudents?: Student[];
  studentsLoading?: boolean;
  studentsError?: string | null;
  onClose: () => void;
  onBackToPreview?: () => void;
  onImportSuccess?: (result: StudentImportResult) => void;
}

export function ExcelValidationModal({
  open,
  validationResult,
  existingStudents = [],
  studentsLoading = false,
  studentsError = null,
  onClose,
  onBackToPreview,
  onImportSuccess,
}: ExcelValidationModalProps) {
  const { showToast } = useToast();
  const [expandedSheetIndex, setExpandedSheetIndex] = useState<number | null>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<ExcelImportMode>("create-only");

  if (!open || !validationResult) return null;

  const handleSafeClose = () => {
    if (isImporting) return;
    setImportMode("create-only");
    onClose();
  };

  const handleConfirmImport = async () => {
    if (isImporting) return;

    if (studentsLoading) {
      showToast("Danh sách học sinh đang được tải. Vui lòng chờ tải hoàn tất để nhập Excel.", "info");
      return;
    }

    if (studentsError) {
      showToast("Không thể nạp danh sách học sinh. Vui lòng tải lại trang trước khi nhập Excel.", "error");
      return;
    }

    setIsImporting(true);

    try {
      const validStudentsToImport: StudentImportItem[] = [];
      for (const sheet of validationResult.sheets) {
        for (const row of sheet.rows) {
          if (row.isValid && row.classId && row.grade) {
            validStudentsToImport.push({
              candidateNumber: row.candidateNumber,
              fullName: row.fullName,
              schoolName: row.schoolName,
              motherPhone: row.motherPhone,
              fatherPhone: row.fatherPhone,
              classId: row.classId,
              className: sheet.matchedClass?.className || row.classId,
              grade: row.grade,
            });
          }
        }
      }

      const result = await importStudentsFromExcel(validStudentsToImport, importMode, existingStudents);
      if (onImportSuccess) {
        onImportSuccess(result);
      } else {
        let toastMsg = `Đã thêm ${result.importedCount} học sinh.`;
        if (result.skippedCount > 0 || result.failedCount > 0) {
          toastMsg = `Đã thêm ${result.importedCount}. Bỏ qua ${result.skippedCount}. Lỗi ${result.failedCount}.`;
        }
        showToast(toastMsg, result.importedCount > 0 ? "success" : "info");
        setImportMode("create-only");
        onClose();
      }
    } catch (error) {
      console.error("[ExcelValidationModal] Lỗi import Firestore:", error);
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Có lỗi xảy ra khi nhập dữ liệu vào Firestore.";
      showToast(errorMessage, "error");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSheetExpand = (index: number) => {
    setExpandedSheetIndex(expandedSheetIndex === index ? null : index);
  };

  const hasNoErrors = validationResult.totalErrorsCount === 0;
  const hasPartialErrors =
    validationResult.invalidRowsCount > 0 && validationResult.validRowsCount > 0;

  return (
    <Modal
      open={open}
      title="Kiểm tra dữ liệu"
      onClose={handleSafeClose}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {onBackToPreview ? (
            <Button
              variant="secondary"
              disabled={isImporting}
              onClick={isImporting ? undefined : onBackToPreview}
              className="px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Quay lại
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={isImporting}
              onClick={handleSafeClose}
              className="px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              disabled={validationResult.validRowsCount === 0 || isImporting || studentsLoading || Boolean(studentsError)}
              onClick={handleConfirmImport}
              className={`px-5 font-semibold text-white ${
                validationResult.validRowsCount === 0 || isImporting || studentsLoading || Boolean(studentsError)
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {isImporting ? "Đang nhập..." : studentsLoading ? "Đang tải học sinh..." : "Xác nhận nhập"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Banner thông báo khi đang nhập dữ liệu */}
        {isImporting && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-pulse">
            <svg
              className="w-5 h-5 text-amber-600 animate-spin shrink-0"
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Đang nhập dữ liệu, vui lòng không đóng cửa sổ.</span>
          </div>
        )}
        {/* Thông tin chung tệp tin */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-sm">
          <span className="text-slate-500 font-medium">File đã kiểm tra:</span>
          <span className="font-semibold text-slate-900 truncate max-w-[280px]" title={validationResult.fileName}>
            {validationResult.fileName}
          </span>
        </div>

        {/* Khối Thống kê tổng quan (5 chỉ số) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-xs text-slate-500 font-medium">Tổng Sheet</div>
            <div className="text-lg font-bold text-slate-800 mt-0.5">{validationResult.totalSheets}</div>
          </div>
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 text-center">
            <div className="text-xs text-blue-600 font-medium">Tổng số dòng</div>
            <div className="text-lg font-bold text-blue-900 mt-0.5">{validationResult.totalRows}</div>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-center">
            <div className="text-xs text-emerald-600 font-medium">Học sinh hợp lệ</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5">{validationResult.validRowsCount}</div>
          </div>
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-center">
            <div className="text-xs text-amber-600 font-medium">Học sinh không hợp lệ</div>
            <div className="text-lg font-bold text-amber-800 mt-0.5">{validationResult.invalidRowsCount}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 text-center">
            <div className="text-xs text-rose-600 font-medium">Tổng lỗi</div>
            <div className="text-lg font-bold text-rose-800 mt-0.5">{validationResult.totalErrorsCount}</div>
          </div>
        </div>

        {/* Thông báo hợp lệ hoàn toàn */}
        {hasNoErrors && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Dữ liệu hợp lệ và sẵn sàng nhập.</span>
          </div>
        )}

        {/* Cảnh báo có cả dòng hợp lệ và không hợp lệ */}
        {hasPartialErrors && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Các dòng lỗi sẽ không được nhập.</span>
          </div>
        )}

        {/* Lựa chọn Chế độ nhập */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-sm">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Chế độ nhập
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all touch-choice-label ${
                importMode === "create-only"
                  ? "border-teal-500 bg-teal-50/50 text-teal-900 font-semibold shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="importMode"
                value="create-only"
                checked={importMode === "create-only"}
                onChange={() => setImportMode("create-only")}
                disabled={isImporting}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Chỉ thêm học sinh mới</div>
              </div>
            </label>

            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all touch-choice-label ${
                importMode === "upsert"
                  ? "border-teal-500 bg-teal-50/50 text-teal-900 font-semibold shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="importMode"
                value="upsert"
                checked={importMode === "upsert"}
                onChange={() => setImportMode("upsert")}
                disabled={isImporting}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Thêm mới và cập nhật học sinh đã có</div>
              </div>
            </label>
          </div>

          {/* Mô tả theo chế độ chọn */}
          <div className="text-xs text-slate-600 bg-white border border-slate-200/80 rounded-lg p-2.5 leading-relaxed">
            {importMode === "create-only" ? (
              <p>Học sinh đã tồn tại theo Khối + SBD sẽ được bỏ qua.</p>
            ) : (
              <div className="space-y-1.5">
                <p>Học sinh chưa có sẽ được thêm mới. Học sinh đã có sẽ được cập nhật thông tin từ file Excel.</p>
                <p className="text-amber-800 font-medium pt-1.5 border-t border-slate-100 flex items-start gap-1.5">
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Thông tin Họ tên, Trường, SĐT mẹ, SĐT bố và Lớp sẽ được cập nhật theo file Excel.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danh sách thống kê theo từng Sheet */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Chi tiết kiểm tra theo từng Sheet ({validationResult.sheets.length})
          </label>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {validationResult.sheets.map((sheet: ValidatedSheet, index: number) => {
              const isExpanded = expandedSheetIndex === index;
              const hasSheetErrors = sheet.invalidRowsCount > 0 || !sheet.matchedClass;

              return (
                <div
                  key={sheet.sheetName || index}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    hasSheetErrors
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Header của từng Sheet: Tên Sheet, Tên lớp, Khối, Tổng số học sinh, Hợp lệ, Không hợp lệ */}
                  <div
                    onClick={() => toggleSheetExpand(index)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {sheet.sheetName}
                      </span>

                      {sheet.matchedClass ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-teal-100 text-teal-800 shrink-0">
                          Lớp: {sheet.matchedClass.className} (Khối {sheet.matchedClass.grade})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 shrink-0">
                          Chưa khớp lớp
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-slate-500">
                          Tổng: <strong className="text-slate-800">{sheet.totalRows}</strong>
                        </span>
                        <span className="text-emerald-700 font-medium">
                          Hợp lệ: {sheet.validRowsCount}
                        </span>
                        {sheet.invalidRowsCount > 0 && (
                          <span className="text-rose-600 font-semibold">
                            Lỗi: {sheet.invalidRowsCount}
                          </span>
                        )}
                      </div>

                      <svg
                        className={`w-4 h-4 text-slate-400 transform transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Chi tiết danh sách dòng lỗi của Sheet (mở rộng - Accordion) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200/80 p-3 bg-white space-y-2 text-xs">
                      {sheet.errorRows.length > 0 ? (
                        <div>
                          <div className="font-semibold text-rose-700 mb-2 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Danh sách dòng không hợp lệ ({sheet.errorRows.length}):</span>
                          </div>

                          <div className="overflow-x-auto border border-rose-100 rounded-lg">
                            <table className="w-full text-left min-w-[480px]">
                              <thead className="bg-rose-50/80 text-rose-900 font-semibold border-b border-rose-100">
                                <tr>
                                  <th className="px-2.5 py-1.5 w-20 text-center">Dòng Excel</th>
                                  <th className="px-2.5 py-1.5 w-16 text-center">SBD</th>
                                  <th className="px-2.5 py-1.5 w-32">Họ tên</th>
                                  <th className="px-2.5 py-1.5">Nội dung lỗi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-rose-50 bg-white">
                                {sheet.errorRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-rose-50/30">
                                    <td className="px-2.5 py-1.5 text-center font-mono font-medium text-slate-600">
                                      Dòng {row.rowIndex}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-800">
                                      {row.candidateNumber || "—"}
                                    </td>
                                    <td className="px-2.5 py-1.5 font-medium text-slate-900">
                                      {row.fullName || <span className="text-slate-400 italic">(Trống)</span>}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-rose-700 font-medium">
                                      {row.errors.join("; ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-slate-600 font-medium bg-slate-50 rounded-lg border border-slate-200">
                          Không có lỗi.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

