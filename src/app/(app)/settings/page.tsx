/**
 * Settings Page
 *
 * Account settings page with profile, preferences, and security options.
 */
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useSettings } from '@/hooks/use-settings';
import { SettingsForm } from '@/components/settings-form';
import { SecuritySettings } from '@/components/security-settings';

/**
 * Settings page component
 */
export default function SettingsPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isLoading: settingsLoading } = useSettings();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Show loading state
  if (authLoading || settingsLoading) {
    return (
      <div className="settings-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="settings-page">
        <div className="loading">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Profile & Preferences</h2>
        <SettingsForm />
      </section>

      <section className="settings-section security">
        <h2>Security</h2>
        <SecuritySettings />
      </section>
    </div>
  );
}
