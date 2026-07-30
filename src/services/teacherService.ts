import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
  User,
} from "firebase/auth";
import { db, getSecondaryAuth } from "../lib/firebase";
import { TeacherProfile, TeacherStatus } from "../types/teacher";

export interface CreateTeacherParams {
  displayName: string;
  email: string;
  password: string;
  role?: string;
}

export async function createTeacherAccount(
  params: CreateTeacherParams
): Promise<TeacherProfile> {
  const cleanDisplayName = (params.displayName || "").trim();
  const cleanEmail = (params.email || "").trim().toLowerCase();
  const password = params.password || "";
  const role = params.role ? params.role.trim() : "teacher";

  // 1. Validation
  if (!cleanDisplayName) {
    throw new Error("Họ và tên không được để trống.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error("Địa chỉ email không hợp lệ.");
  }

  if (!password || password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
  }

  if (role !== "teacher") {
    throw new Error("Mục 12A3 chỉ hỗ trợ tạo tài khoản với vai trò 'teacher'.");
  }

  // 2. Secondary Auth & User Tracking
  const secondaryAuth = getSecondaryAuth();
  let createdAuthUser: User | null = null;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      cleanEmail,
      password
    );

    createdAuthUser = userCredential.user;
    const uid = createdAuthUser.uid;

    // 3. Ghi document Firestore
    try {
      await setDoc(doc(db, "teachers", uid), {
        uid,
        email: cleanEmail,
        displayName: cleanDisplayName,
        role: "teacher",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsError: any) {
      console.error(
        "Lỗi ghi document teachers trong Firestore khi tạo giáo viên (uid:",
        uid,
        "):",
        fsError
      );

      // Rollback: thu hồi tài khoản Auth vừa tạo nếu Firestore lỗi
      if (createdAuthUser) {
        try {
          await deleteUser(createdAuthUser);
          throw new Error(
            "Không thể tạo hồ sơ giáo viên. Tài khoản đăng nhập vừa tạo đã được thu hồi."
          );
        } catch (deleteError: any) {
          if (
            deleteError.message ===
            "Không thể tạo hồ sơ giáo viên. Tài khoản đăng nhập vừa tạo đã được thu hồi."
          ) {
            throw deleteError;
          }
          console.error(
            "Lỗi thu hồi tài khoản Auth sau khi Firestore thất bại:",
            deleteError
          );
          throw new Error(
            "Không thể lưu hồ sơ giáo viên và không thể thu hồi tài khoản đăng nhập. Cần kiểm tra Firebase Authentication thủ công."
          );
        }
      } else {
        throw new Error("Không thể lưu hồ sơ giáo viên vào Firestore.");
      }
    }

    const isoNow = new Date().toISOString();
    return {
      uid,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role: "teacher",
      status: "active",
      createdAt: isoNow,
      updatedAt: isoNow,
    };
  } catch (error: any) {
    if (error.code) {
      switch (error.code) {
        case "auth/email-already-in-use":
          throw new Error("Email này đã được sử dụng cho một tài khoản khác.");
        case "auth/invalid-email":
          throw new Error("Địa chỉ email không hợp lệ.");
        case "auth/weak-password":
          throw new Error("Mật khẩu quá yếu (cần tối thiểu 6 ký tự).");
        case "auth/operation-not-allowed":
          throw new Error(
            "Phương thức Đăng nhập bằng Email/Mật khẩu chưa được bật trên Firebase Console."
          );
        default:
          throw new Error(error.message || "Lỗi tạo tài khoản giáo viên.");
      }
    }
    throw error;
  } finally {
    try {
      if (secondaryAuth.currentUser) {
        await signOut(secondaryAuth);
      }
    } catch (signOutErr) {
      console.error("Lỗi khi signOut secondaryAuth:", signOutErr);
    }
  }
}

function normalizeDate(value: unknown): string {

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

function mapDocToTeacherProfile(id: string, data: Record<string, unknown>): TeacherProfile {
  return {
    uid: id || (data.uid as string) || "",
    email: (data.email as string) || "",
    displayName: (data.displayName as string) || "",
    role: (data.role as TeacherProfile["role"]) || "teacher",
    status: (data.status as TeacherStatus) || "pending",
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

export async function getAllTeachers(): Promise<TeacherProfile[]> {
  const teachersQuery = query(
    collection(db, "teachers"),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(teachersQuery);
  const teachers: TeacherProfile[] = [];

  querySnapshot.forEach((docSnap) => {
    teachers.push(mapDocToTeacherProfile(docSnap.id, docSnap.data()));
  });

  return teachers;
}

export async function getTeacher(uid: string): Promise<TeacherProfile | null> {
  if (!uid) return null;
  const docRef = doc(db, "teachers", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return mapDocToTeacherProfile(docSnap.id, docSnap.data());
  }
  return null;
}

export async function updateTeacherDisplayName(
  uid: string,
  displayName: string,
  adminUserId: string
): Promise<void> {
  const cleanUid = (uid || "").trim();
  const cleanName = (displayName || "").trim();
  const cleanAdminId = (adminUserId || "").trim();

  if (!cleanUid) {
    throw new Error("Mã giáo viên (uid) không hợp lệ.");
  }

  if (!cleanName) {
    throw new Error("Họ và tên không được để trống.");
  }

  if (cleanName.length > 100) {
    throw new Error("Họ và tên không được quá 100 ký tự.");
  }

  if (!cleanAdminId) {
    throw new Error("Thông tin người thực hiện không hợp lệ.");
  }

  const docRef = doc(db, "teachers", cleanUid);
  await updateDoc(docRef, {
    displayName: cleanName,
    updatedAt: serverTimestamp(),
    updatedByUserId: cleanAdminId,
  });
}

export async function updateTeacherStatus(
  uid: string,
  status: TeacherStatus,
  adminUserId: string
): Promise<void> {
  const cleanUid = (uid || "").trim();
  const cleanAdminId = (adminUserId || "").trim();

  if (!cleanUid) {
    throw new Error("Mã giáo viên (uid) không hợp lệ.");
  }

  if (!cleanAdminId) {
    throw new Error("Thông tin người thực hiện không hợp lệ.");
  }

  if (status !== "active" && status !== "disabled") {
    throw new Error("Trạng thái chỉ có thể là 'active' hoặc 'disabled'.");
  }

  const docRef = doc(db, "teachers", cleanUid);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
    updatedByUserId: cleanAdminId,
  });
}
