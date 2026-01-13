/**
 * Settings Form Component
 *
 * Form for managing user profile and preferences.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  useSettings,
  useUpdateProfile,
  useUpdatePreferences,
  type UpdatePreferencesInput,
} from '@/hooks/use-settings';

/**
 * Form state for profile and preferences
 */
interface FormState {
  displayName: string;
  theme: 'light' | 'dark' | 'system';
  defaultPrivacy: 'private' | 'family' | 'public';
  emailNotifications: boolean;
  emailDigestFrequency: 'daily' | 'weekly' | 'never';
}

/**
 * SettingsForm component for profile and preference management
 */
export function SettingsForm(): React.ReactElement {
  const { data: settings, isLoading } = useSettings();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();

  const [formState, setFormState] = useState<FormState>({
    displayName: '',
    theme: 'dark',
    defaultPrivacy: 'private',
    emailNotifications: true,
    emailDigestFrequency: 'daily',
  });

  const [initialState, setInitialState] = useState<FormState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      const state: FormState = {
        displayName: settings.displayName || '',
        theme: settings.preferences.theme,
        defaultPrivacy: settings.preferences.defaultPrivacy,
        emailNotifications: settings.preferences.emailNotifications,
        emailDigestFrequency: settings.preferences.emailDigestFrequency,
      };
      setFormState(state);
      setInitialState(state);
    }
  }, [settings]);

  // Check if form has changes
  const hasChanges = useCallback(() => {
    if (!initialState) return false;
    return (
      formState.displayName !== initialState.displayName ||
      formState.theme !== initialState.theme ||
      formState.defaultPrivacy !== initialState.defaultPrivacy ||
      formState.emailNotifications !== initialState.emailNotifications ||
      formState.emailDigestFrequency !== initialState.emailDigestFrequency
    );
  }, [formState, initialState]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate display name
    if (!formState.displayName.trim()) {
      setValidationError('Display name is required');
      return;
    }

    try {
      // Check if profile changed
      if (initialState && formState.displayName !== initialState.displayName) {
        await updateProfile.mutateAsync({ displayName: formState.displayName });
      }

      // Check if preferences changed
      if (initialState) {
        const preferencesChanged =
          formState.theme !== initialState.theme ||
          formState.defaultPrivacy !== initialState.defaultPrivacy ||
          formState.emailNotifications !== initialState.emailNotifications ||
          formState.emailDigestFrequency !== initialState.emailDigestFrequency;

        if (preferencesChanged) {
          const preferencesInput: UpdatePreferencesInput = {};
          if (formState.theme !== initialState.theme) {
            preferencesInput.theme = formState.theme;
          }
          if (formState.defaultPrivacy !== initialState.defaultPrivacy) {
            preferencesInput.defaultPrivacy = formState.defaultPrivacy;
          }
          if (formState.emailNotifications !== initialState.emailNotifications) {
            preferencesInput.emailNotifications = formState.emailNotifications;
          }
          if (formState.emailDigestFrequency !== initialState.emailDigestFrequency) {
            preferencesInput.emailDigestFrequency = formState.emailDigestFrequency;
          }
          await updatePreferences.mutateAsync(preferencesInput);
        }
      }

      setSuccessMessage('Settings saved successfully');
      setInitialState(formState);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      {validationError && (
        <div role="alert" className="error-message">
          {validationError}
        </div>
      )}
      {successMessage && (
        <div role="status" className="success-message">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="error-message">
          {errorMessage}
        </div>
      )}

      <section className="profile-section">
        <h2>Profile</h2>
        <div className="form-field">
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={formState.displayName}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, displayName: e.target.value }))
            }
          />
        </div>
      </section>

      <section className="preferences-section">
        <h2>Preferences</h2>

        <div className="form-field">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={formState.theme}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                theme: e.target.value as 'light' | 'dark' | 'system',
              }))
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="defaultPrivacy">Default Privacy</label>
          <select
            id="defaultPrivacy"
            value={formState.defaultPrivacy}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                defaultPrivacy: e.target.value as 'private' | 'family' | 'public',
              }))
            }
          >
            <option value="private">Private</option>
            <option value="family">Family</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="emailNotifications">Email Notifications</label>
          <input
            id="emailNotifications"
            type="checkbox"
            checked={formState.emailNotifications}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                emailNotifications: e.target.checked,
              }))
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="emailDigestFrequency">Digest Frequency</label>
          <select
            id="emailDigestFrequency"
            value={formState.emailDigestFrequency}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                emailDigestFrequency: e.target.value as 'daily' | 'weekly' | 'never',
              }))
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="never">Never</option>
          </select>
        </div>
      </section>

      <div className="form-actions">
        <button
          type="submit"
          disabled={!hasChanges() || updateProfile.isPending || updatePreferences.isPending}
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
