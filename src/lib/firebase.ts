/**
 * Firebase Client SDK Configuration
 *
 * Initializes Firebase for client-side authentication.
 * In development, connects to Firebase Auth emulator.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
  authDomain: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  storageBucket: process.env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: process.env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
  appId: process.env["NEXT_PUBLIC_FIREBASE_APP_ID"],
};

let app: FirebaseApp;
let auth: Auth;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  }
  return app;
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());

    // Connect to emulator in development (client-side only)
    if (
      process.env["NEXT_PUBLIC_FIREBASE_USE_EMULATOR"] === "true" &&
      typeof window !== "undefined"
    ) {
      const emulatorHost = process.env["FIREBASE_AUTH_EMULATOR_HOST"] ?? "127.0.0.1:9099";
      const [host, port] = emulatorHost.split(":");
      connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
    }
  }
  return auth;
}

// Export lazy-initialized auth
export { getFirebaseAuth as auth };

// Re-export Firebase auth functions
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
};
export type { FirebaseUser };
