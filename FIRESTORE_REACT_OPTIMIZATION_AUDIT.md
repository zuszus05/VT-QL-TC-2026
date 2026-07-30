# FIRESTORE & REACT OPTIMIZATION AUDIT REPORT (13C1)

**Project:** Student Attendance & Extra Study Management System  
**Audit Scope:** Codebase post 13B2-01-Fix, 13B2-02-Fix, 13B2-03-Fix2  
**Date:** July 2026  
**Status:** Audit & Planning Phase (Read-only, no code/rule changes in this step)

---

## 1. Executive Summary

This audit evaluates the current application architecture across Firestore operations (Reads/Writes), React state management, render efficiency, RAM caching mechanisms, race conditions/double-click risks, and Firebase Spark quota sustainability.

### Key Highlights
- **Active Range Isolation (13B2-03-Fix2):** App start only fetches `extraStudyRecords` for a tight active window ($\pm 7$ days). History ranges and date-specific attendance extra studies are handled in isolated state buckets (`extraStudyHistoryRecords`, `attendanceExtraStudyRecords`) with request ID fencing (`latestExtraStudyHistoryRequestRef`, `latestAttendanceRequestRef`).
- **Zero Firestore Read After Write:** All mutation operations (Create, Move, Delete, Archive, Save Attendance) update local React state directly and invalidate specific cache keys without re-querying Firestore collections.
- **Primary Optimization Targets:**
  1. **Unbounded RAM Caches:** Range and report caches grow indefinitely during long sessions.
  2. **Full Collection Reads at Startup:** `getAllStudents()` and `getAllClasses()` fetch all documents regardless of user role or active scope.
  3. **Double-Click & Parallel Write Hazards:** Several action handlers lack strict UI button locks or guard flags during active async execution.
  4. **High Batch Write Volume in Attendance:** Every attendance submission performs a `writeBatch` for all students in the class/session.

---

## 2. Firestore Read Inventory

Below is the complete inventory of all Firestore read call sites across services and components.

| ID | File | Function / Location | Collection | Query / Filter Conditions | Trigger / Timing | Max Call Frequency | Caching Strategy | Priority |
|---|---|---|---|---|---|---|---|---|
| **R1** | `studentService.ts` | `getAllStudents()` | `students` | None (All docs) | App initialization (`App.tsx`) | 1 per app boot / refresh | Held in App state | **P1** |
| **R2** | `classService.ts` | `getAllClasses()` | `classes` | None (All docs) | App initialization (`App.tsx`) | 1 per app boot / refresh | Held in App state | **P1** |
| **R3** | `teacherService.ts` | `getAllTeachers()` | `teachers` | `where("isActive", "==", true)` | App initialization (`App.tsx`) | 1 per app boot / refresh | Held in App state | **P2** |
| **R4** | `teacherProfileService.ts` | `getTeacherByUid()` | `teachers` | `doc(db, "teachers", uid)` | Auth state change / boot | 1 per login / boot | None | **P3** |
| **R5** | `extraStudyService.ts` | `loadExtraStudyRecordsByDateRange()` | `extraStudyRecords` | `where("targetDate", ">=", start)`, `where("targetDate", "<=", end)` | 1) Boot ($\pm 7$ days)<br>2) History tab date range select<br>3) Attendance outside active range | On demand / tab switch / date change | RAM Cache (`extraStudyRangeCacheRef`, `attendanceExtraStudyCacheRef`) | **P1** |
| **R6** | `extraStudyService.ts` | `loadExtraStudyRecords()` | `extraStudyRecords` | None (All docs) | *Legacy fallback / unused in 13B2-03* | Never in standard flow | N/A | **P3** |
| **R7** | `attendanceService.ts` | `loadAttendanceRecords()` | `attendanceRecords` | `where("attendanceDate", "==", date)`, `where("session", "==", session)` | Selecting date & session in Attendance tab | On date/session selection | Race condition fenced by `latestAttendanceRequestRef` | **P1** |
| **R8** | `attendanceService.ts` | `loadDailyAttendanceRecords()` | `attendanceRecords` | `where("attendanceDate", "==", date)` | Viewing Daily Report in Report tab | On date pick in Daily Report | RAM Cache (`dailyReportCacheRef`) | **P2** |
| **R9** | `attendanceService.ts` | `loadMonthlyAttendanceRecords()` | `attendanceRecords` | `where("attendanceDate", ">=", start)`, `where("attendanceDate", "<=", end)` | Viewing Monthly Report in Report tab | On month/year select in Monthly Report | RAM Cache (`monthlyReportCacheRef`) | **P2** |

---

## 3. Firestore Write Inventory

Below is the complete inventory of all Firestore write call sites.

| ID | File | Function | Collection | Operation Type | Batch Size | Read After Write? | Local State Sync | Risk / Double-Click Hazard | Priority |
|---|---|---|---|---|---|---|---|---|---|
| **W1** | `studentService.ts` | `createStudent()` | `students` | `setDoc` | 1 doc | No | Direct `upsertById` in App state | Form submit lock needed | **P2** |
| **W2** | `studentService.ts` | `updateStudent()` | `students` | `updateDoc` | 1 doc | No | Direct `map` in App state | Form submit lock needed | **P2** |
| **W3** | `studentService.ts` | `deleteStudent()` | `students` | `deleteDoc` | 1 doc | No | Direct `filter` in App state | Modal confirmation button lock | **P2** |
| **W4** | `studentImportService.ts` | `importStudents()` | `students` | `writeBatch` | Chunks of 400 | No | Re-fetches students or app state update | Button disabled during import | **P2** |
| **W5** | `classService.ts` | `createClass()` | `classes` | `setDoc` | 1 doc | No | Direct `upsertById` in App state | Form submit lock needed | **P2** |
| **W6** | `classService.ts` | `updateClass()` | `classes` | `updateDoc` | 1 doc | No | Direct `map` in App state | Form submit lock needed | **P2** |
| **W7** | `classService.ts` | `deleteClass()` | `classes` | `deleteDoc` | 1 doc | No | Direct `filter` in App state | Modal confirmation button lock | **P2** |
| **W8** | `extraStudyService.ts` | `createExtraStudyRecords()` | `extraStudyRecords` | `writeBatch` | Chunks of 400 | No | Active range filter & upsert; Cache invalidated | High: Modal submit button lock needed | **P0** |
| **W9** | `extraStudyService.ts` | `deleteExtraStudyRecord()` | `extraStudyRecords` | `deleteDoc` | 1 doc | No | Filtered from active/history/attendance states; Cache invalidated | Action button disabled state | **P1** |
| **W10** | `extraStudyService.ts` | `updateExtraStudySchedule()` | `extraStudyRecords` | `updateDoc` | 1 doc | No | Range checks & state update; Cache invalidated | Action button disabled state | **P1** |
| **W11** | `extraStudyService.ts` | `archiveExtraStudyRecords()` | `extraStudyRecords` | `writeBatch` | Chunks of 400 | No | Active & history state updated; Cache invalidated | Button lock after 22:00 check | **P1** |
| **W12** | `attendanceService.ts` | `saveAttendanceRecords()` | `attendanceRecords` | `writeBatch` | Chunks of 400 | No | Direct state update (`setAttendanceRecords`) | High: Fast-click on "Lưu điểm danh" | **P0** |
| **W13** | `attendanceService.ts` | `finalizeAttendanceRecords()` | `attendanceRecords` | `writeBatch` | Chunks of 400 | No | Direct state update (`setAttendanceRecords`) | High: Fast-click on "Chốt vắng" | **P0** |
| **W14** | `attendanceService.ts` | `updateAttendanceNoteDirect()` | `attendanceRecords` | `updateDoc` | 1 doc | No | Local state updated | Debounced input or blur handler | **P2** |
| **W15** | `attendanceService.ts` | `updateAttendanceReinforcementNoteDirect()` | `attendanceRecords` | `updateDoc` | 1 doc | No | Local state updated | Debounced input or blur handler | **P2** |
| **W16** | `teacherService.ts` | `saveTeacher()` / `updateTeacher()` | `teachers` | `setDoc` / `updateDoc` | 1 doc | No | Direct state update | Form submit lock | **P2** |

---

## 4. App Startup Analysis

### Initial Execution Flow (`App.tsx` on mount / login)
1. **Auth Verification:** Reads `teachers` doc for current user UID to establish permissions (Admin vs Teacher).
2. **Parallel Base Load (`Promise.all`):**
   - `getAllStudents()` $\rightarrow$ Queries entire `students` collection.
   - `getAllClasses()` $\rightarrow$ Queries entire `classes` collection.
   - `getAllTeachers()` $\rightarrow$ Queries active `teachers`.
   - `loadExtraStudy()` $\rightarrow$ Queries `extraStudyRecords` where `targetDate` $\in [\text{today}-7, \text{today}+7]$.

### Issues Identified
- **Role Parity Overhead:** Both Admin and Teacher accounts load all students and all classes. A Teacher assigned to 2 classes still downloads the records of all 500+ students in the system.
- **Unused Initial Data:** `attendanceRecords` are NOT loaded on startup (correctly deferred to Attendance/Report tab access).
- **Optimization Opportunities:** Teacher accounts could optionally filter or scope student loading by assigned class IDs if role-based collection scoping is desired in future, but currently keeping global student state for UI lookup is manageable if cached.

---

## 5. React State and Render Analysis

### State Organization
- `students`, `classes`, `teachers`: Primary entities held in `App.tsx` top-level state.
- `extraStudyRecords`: Active range schedule ($\pm 7$ days).
- `extraStudyHistoryRecords`: Isolated history query results.
- `attendanceExtraStudyRecords`: Isolated date-specific extra study for Attendance page outside active range.
- `attendanceRecords`: Attendance entries for selected date & session.

### Render Efficiency Observations
1. **`ReinforcementPage` & `AttendancePage` Re-renders:**
   - Long lists of students ($30-50+$ items) render child row/card components without `React.memo`.
   - Modifying a single student's attendance status or typing a note forces the entire page and all student rows to re-render.
2. **Callback Stability:**
   - Most handlers in `App.tsx` use `useCallback` with stable dependencies (`fbUser`, `currentUser`).
   - However, inline object definitions or anonymous callbacks created inside JSX loops in child components invalidate prop equality for memoized children.
3. **Derived Data:**
   - Filtering students by class or computing daily attendance statistics is calculated on every render. Wrapping these calculations in `useMemo` will improve UI responsiveness during rapid inputs.

---

## 6. Cache Analysis

The application maintains four in-memory (`useRef` / `Map`) cache stores in `App.tsx`:

| Cache Ref Name | Structure | Scope | Invalidation Trigger | Clear Trigger | Potential Risks |
|---|---|---|---|---|---|
| `extraStudyRangeCacheRef` | `Map<string, ReinforcementScheduleRecord[]>` | History tab date ranges (`start|end`) | Specific date matching via `invalidateExtraStudyRangeCacheForDate(date)` on Create, Move, Delete, Archive | Logout / User Change | Unbounded size growth if user navigates many ranges in a single session |
| `attendanceExtraStudyCacheRef` | `Map<string, ReinforcementScheduleRecord[]>` | Attendance tab single dates (`date`) | Invalidated via `invalidateExtraStudyRangeCacheForDate(date)` on Create, Move, Delete, Archive | Logout / User Change | Unbounded size growth across multi-day attendance navigation |
| `dailyReportCacheRef` | `Map<string, ReportAttendanceRecord[]>` | Daily Reports (`date`) | Cleared on logout / user change | Logout / User Change | Potential stale data if attendance is edited in Attendance tab after report is cached |
| `monthlyReportCacheRef` | `Map<string, MonthlyReportData>` | Monthly Reports (`start|end`) | Cleared on logout / user change | Logout / User Change | Potential stale data if attendance is edited after monthly report is cached |

### Key Observations
- **Cache Clearing on User Switch:** All 4 RAM caches are cleared in `App.tsx` `useEffect` when `currentUser` changes or logs out (`dailyReportCacheRef.current.clear()`, `monthlyReportCacheRef.current.clear()`, `extraStudyRangeCacheRef.current.clear()`, `attendanceExtraStudyCacheRef.current.clear()`).
- **Cache Invalidation Gap on Attendance Write:** When attendance is saved or modified in `AttendancePage`, `dailyReportCacheRef` and `monthlyReportCacheRef` are NOT currently invalidated. If a user saves attendance, then switches to the Report tab for the same date, the report cache will serve the pre-update report until refresh or logout.

---

## 7. Double Click and Parallel Request Analysis

| Action | Component / Handler | Protection Currently Present? | Race Condition Risk | Consequence of Failure |
|---|---|---|---|---|
| **Save Attendance** | `AttendancePage.tsx` / `handleSave` | Partial (`saving` state present, but double click before state update possible) | Medium-High | Duplicate `writeBatch` executions |
| **Finalize Attendance** | `AttendancePage.tsx` / `handleFinalize` | Partial | Medium-High | Multiple batch updates for same session |
| **Create Extra Study** | `ReinforcementPage.tsx` / Modal Submit | Partial (Modal loading state) | Medium | Duplicate extra study entries created |
| **Move Schedule** | `ReinforcementPage.tsx` / Drop handler | No button lock / debouncing | Low-Medium | Parallel `updateDoc` calls for same document |
| **Delete Schedule** | `ReinforcementPage.tsx` / Confirm Delete | Partial | Low-Medium | 404 error on second `deleteDoc` call |
| **History Date Select** | `ReinforcementPage.tsx` / `onLoadHistoryRange` | Request ID Fencing (`latestExtraStudyHistoryRequestRef`) | Protected | Out-of-order response discarded cleanly |
| **Attendance Date Select** | `AttendancePage.tsx` / `loadAttendanceView` | Request ID Fencing (`latestAttendanceRequestRef`) | Protected | Out-of-order response discarded cleanly |

---

## 8. Firebase Spark Usage Estimate

### Usage Parameters & Assumptions
- **User Base:** 5 Teachers, 500 Students, 20 Classes.
- **Daily Activity:** 50 Extra study records created/moved per day. 3 sessions per day.
- **Monthly Usage:** 22 operating days per month.

### Estimated Quotas & Projections

#### A. Daily Reads Calculation
1. **App Boot (5 Teachers $\times$ 1 boot/day):**
   - 500 Students + 20 Classes + 10 Teachers + 30 Extra Study ($\pm 7$ days) = 560 Reads / boot.
   - 5 boots $\times 560 = 2,800$ Reads/day.
2. **Attendance Navigation (3 sessions/day $\times$ 5 teachers = 15 session loads):**
   - Average 25 attendance records per session query $\times 15 = 375$ Reads/day.
3. **Report Viewing (10 report loads/day):**
   - Daily report (25 records) + Monthly report (cached) = 250 Reads/day.
4. **Total Projected Daily Reads:** $\sim 3,425$ Reads/day.
5. **Firebase Spark Free Quota:** 50,000 Reads/day $\rightarrow$ **Current usage is $<7\%$ of daily quota.**

#### B. Daily Writes Calculation
1. **Attendance Saves (15 session saves/day):**
   - Batch of 25 students $\times 15 = 375$ Writes/day.
2. **Extra Study Operations (50 creations/moves/day):**
   - 50 Writes/day.
3. **Total Projected Daily Writes:** $\sim 425$ Writes/day.
4. **Firebase Spark Free Quota:** 20,000 Writes/day $\rightarrow$ **Current usage is $<2.5\%$ of daily quota.**

---

## 9. Prioritized Findings

| Priority | Code | File / Function | Problem Description | Impact & Consequence | Recommended Fix Direction |
|---|---|---|---|---|---|
| **P0** | **P0-1** | `App.tsx` / `AttendancePage.tsx` | Report caches (`dailyReportCacheRef`, `monthlyReportCacheRef`) are not invalidated when attendance records are updated or finalized in Attendance tab. | Viewing a report after updating attendance shows stale data until app refresh. | Invalidate or clear report caches upon `saveAttendanceRecords` / `finalizeAttendanceRecords` in `App.tsx`. |
| **P0** | **P0-2** | `AttendancePage.tsx` / `ReinforcementPage.tsx` | Absence of explicit ref-based or atomic request lock on critical submit buttons (Save Attendance, Finalize, Create Schedule). | Fast double-clicking triggers parallel `writeBatch` executions. | Add `isSubmittingRef` guard in submission handlers alongside standard React state flags. |
| **P1** | **P1-1** | `App.tsx` (RAM Caches) | `extraStudyRangeCacheRef` and `attendanceExtraStudyCacheRef` have no size cap or LRU eviction limit. | Memory growth during prolonged navigation across many date ranges. | Implement maximum size cap (e.g. 20 entries) with basic FIFO/LRU eviction for range caches. |
| **P1** | **P1-2** | `AttendancePage.tsx` | Rendering 30–50 student rows on every state or input change without `React.memo` or memoized item components. | Noticeable input lag or jank when typing attendance notes or toggling checkboxes. | Extract student row item component and wrap with `React.memo`. |
| **P2** | **P2-1** | `App.tsx` / `studentService.ts` | Startup loads all 500+ students for all users. | Unnecessary payload download for teachers with scoped classes. | Maintain global student list in App state but optimize rendering in scoped dropdowns with `useMemo`. |
| **P2** | **P2-2** | `ReinforcementPage.tsx` | Daily schedule grid recalculates list filters on every render. | Unnecessary CPU cycles during modal toggles or state updates. | Wrap schedule filter computations in `useMemo`. |
| **P3** | **P3-1** | `App.tsx` | Minor redundant profile check during auth state initialization. | 1 extra `getDoc` call on initial boot. | Streamline auth profile resolution. |

---

## 10. Proposed 13C Roadmap

To safely implement these optimizations without risking regression or breaking existing functionality, the following modular plan is proposed:

### Step 13C2-01: Report Cache Invalidation & Double-Click Protection
- Invalidate `dailyReportCacheRef` and `monthlyReportCacheRef` whenever attendance records are saved or updated in `App.tsx`.
- Add atomic submission guards (`isSubmittingRef`) to "Save Attendance", "Finalize Attendance", and "Create Extra Study" actions to eliminate double-click batch writes.

### Step 13C2-02: RAM Cache Size Capping & Eviction Policy
- Bound `extraStudyRangeCacheRef` and `attendanceExtraStudyCacheRef` to a max capacity (e.g., 20 keys) with FIFO eviction.

### Step 13C2-03: React Render Optimization & List Memoization
- Extract and wrap student row components in `AttendancePage` and `ReinforcementPage` with `React.memo`.
- Memoize heavy filter/stat calculations using `useMemo`.

---
*End of Audit Report.*
