/**
 * Firebase Admin SDK Configuration (Server-side)
 *
 * Provides server-side Firebase Admin SDK for token verification.
 * Only used in API routes, not in client components.
 */
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;
let adminAuth: Auth | null = null;

interface FirebaseAdmin {
  app: App;
  auth: Auth;
}

/**
 * Get or initialize Firebase Admin SDK.
 * Uses singleton pattern to avoid multiple initializations.
 */
export function getFirebaseAdmin(): FirebaseAdmin {
  if (!app || !adminAuth) {
    const existingApps = getApps();

    if (existingApps.length === 0) {
      const serviceAccount: ServiceAccount = {
        projectId: process.env["FIREBASE_ADMIN_PROJECT_ID"],
        clientEmail: process.env["FIREBASE_ADMIN_CLIENT_EMAIL"],
        privateKey: process.env["FIREBASE_ADMIN_PRIVATE_KEY"]?.replace(/\\n/g, "\n"),
      };

      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      app = existingApps[0]!;
    }

    adminAuth = getAuth(app);
  }

  return { app, auth: adminAuth };
}

/**
 * Check if Firebase Admin is properly configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env["FIREBASE_ADMIN_PROJECT_ID"] &&
    process.env["FIREBASE_ADMIN_CLIENT_EMAIL"] &&
    process.env["FIREBASE_ADMIN_PRIVATE_KEY"]
  );
}
