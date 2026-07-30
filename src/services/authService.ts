import { signInWithEmailAndPassword, signOut, UserCredential } from "firebase/auth";
import { auth } from "../lib/firebase";

export async function signIn(email: string, password: string): Promise<UserCredential> {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser(): Promise<void> {
  return await signOut(auth);
}
