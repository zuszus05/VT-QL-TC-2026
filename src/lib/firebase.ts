import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxy6eMvIgM4BXU5PeRk2Mx9Pn9iPN63YY",
  authDomain: "quan-ly-tc-2026.firebaseapp.com",
  projectId: "quan-ly-tc-2026",
  storageBucket: "quan-ly-tc-2026.firebasestorage.app",
  messagingSenderId: "844350044274",
  appId: "1:844350044274:web:3f008fa046be743b68aaeb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);

const SECONDARY_APP_NAME = "SecondaryApp";

export function getSecondaryAuth(): Auth {
  const existingApp = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const secondaryApp =
    existingApp || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
}

