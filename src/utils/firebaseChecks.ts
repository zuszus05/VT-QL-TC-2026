import { firebaseApp, auth, db } from "../lib/firebase";

export function runFirebaseChecks(): boolean {
  const isAppOk = Boolean(firebaseApp);
  const isAuthOk = Boolean(auth);
  const isDbOk = Boolean(db);
  const isProjectOk = firebaseApp?.options?.projectId === "quan-ly-tc-2026";

  if (import.meta.env.DEV) {
    console.log("[Firebase Init Check]", {
      isAppOk,
      isAuthOk,
      isDbOk,
      isProjectOk,
      projectId: firebaseApp?.options?.projectId,
    });
  }

  return isAppOk && isAuthOk && isDbOk && isProjectOk;
}
