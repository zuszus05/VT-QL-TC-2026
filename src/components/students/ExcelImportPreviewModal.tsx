import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { ExcelFilePreviewData } from "../../utils/excelReader";

export interface ExcelImportPreviewModalProps {
  open: boolean;
  data: ExcelFilePreviewData | null;
  onClose: () => void;
  onContinueImport?: () => void;
}

export function ExcelImportPreviewModal({
  open,
  data,
  onClose,
  onContinueImport,
}: ExcelImportPreviewModalProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

  if (!open || !data) return null;

  const handleContinueImport = () => {
    if (onContinueImport) {
      onContinueImport();
    } else {
      console.log("Ready for Firestore import.");
      onClose();
    }
  };

  const currentSheet = data.sheets[activeSheetIndex] || data.sheets[0];
  const previewStudents = currentSheet ? currentSheet.students.slice(0, 5) : [];

  return (
    <Modal
      open={open}
      title="Xem trước dữ liệu"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="px-4 font-medium">
            Đóng
          </Button>
          <Button
            variant="primary"
            onClick={handleContinueImport}
            className="px-5 font-semibold bg-teal-600 hover:bg-teal-700 text-white"
          >
            Tiếp tục nhập
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Thông tin tệp tin */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-medium">Tên file:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[240px]" title={data.fileName}>
              {data.fileName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-sm">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">Tổng số Sheet</span>
              <span className="text-base font-bold text-teal-700">{data.totalSheets} Sheet</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">Tổng số học sinh</span>
              <span className="text-base font-bold text-teal-700">{data.totalStudents} học sinh</span>
            </div>
          </div>
        </div>

        {/* Danh sách các Sheet dạng danh sách / Tab */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Danh sách các Sheet ({data.sheets.length})
          </label>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-slate-100/70 rounded-xl border border-slate-200/60">
            {data.sheets.map((sheet, index) => {
              const isActive = index === activeSheetIndex;
              return (
                <button
                  key={sheet.sheetName || index}
                  type="button"
                  onClick={() => setActiveSheetIndex(index)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{sheet.sheetName || `Sheet ${index + 1}`}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      isActive ? "bg-teal-700 text-teal-100" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sheet.students.length} học sinh
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bảng xem trước khoảng 5 học sinh đầu tiên của Sheet đang chọn */}
        {currentSheet && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Xem trước 5 học sinh đầu tiên ({currentSheet.sheetName}):
              </span>
              <span className="text-xs text-slate-500">
                Hiển thị {previewStudents.length}/{currentSheet.students.length} học sinh
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs min-w-[320px]">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-center w-16">SBD</th>
                    <th className="px-3 py-2">Tên</th>
                    <th className="px-3 py-2">Trường</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewStudents.length > 0 ? (
                    previewStudents.map((st, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-mono text-center text-teal-700 font-bold">
                          {st.candidateNumber || "—"}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {st.fullName || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {st.schoolName || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">
                        Không có dữ liệu học sinh trong Sheet này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
