import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { TeacherProfile } from "../types/teacher";

export async function getTeacherProfile(uid: string): Promise<TeacherProfile | null> {
  if (!uid) return null;
  const docRef = doc(db, "teachers", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as TeacherProfile;
  }

  return null;
}
