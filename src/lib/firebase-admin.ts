/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes the Firebase Admin SDK for server-side use.
 * It provides token verification and user management capabilities.
 *
 * Note: This runs on the SERVER side only. Never import this in client code.
 */
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

export interface FirebaseAdminInstance {
  app: App;
  auth: Auth;
}

/**
 * Get Firebase Admin instance (singleton pattern)
 *
 * Creates or returns existing Firebase Admin app and auth instances.
 * Uses environment variables for configuration.
 */
export function getFirebaseAdmin(): FirebaseAdminInstance {
  if (!adminApp) {
    if (getApps().length === 0) {
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      adminApp = getApps()[0];
    }
    adminAuth = getAuth(adminApp);
  }

  return {
    app: adminApp!,
    auth: adminAuth!,
  };
}
