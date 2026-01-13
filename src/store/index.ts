/**
 * Zustand stores for client-side state management
 */

// Auth store
export { useAuthStore, type AuthUser } from './auth-store';

// UI store
export {
  useUIStore,
  type Theme,
  type ViewMode,
  type CameraTarget,
} from './ui-store';
