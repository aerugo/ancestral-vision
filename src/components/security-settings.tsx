/**
 * Security Settings Component
 *
 * Allows users to change their email and password via Firebase Auth.
 */
'use client';

import React, { useState } from 'react';
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/auth-provider';

/**
 * Email regex pattern for validation
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * SecuritySettings component for email and password changes
 */
export function SecuritySettings(): React.ReactElement {
  const { user } = useAuth();

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change state
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  /**
   * Handle email change
   */
  const handleEmailChange = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    // Validate current password
    if (!emailCurrentPassword) {
      setEmailError('Current password is required');
      return;
    }

    // Validate email format
    if (!EMAIL_REGEX.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !user?.email) {
        setEmailError('No user is currently signed in');
        return;
      }

      // Re-authenticate before changing email
      const credential = EmailAuthProvider.credential(user.email, emailCurrentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update email
      await updateEmail(currentUser, newEmail);
      setEmailSuccess('Email updated successfully');
      setNewEmail('');
      setEmailCurrentPassword('');
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate current password
    if (!passwordCurrentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    // Validate password length
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !user?.email) {
        setPasswordError('No user is currently signed in');
        return;
      }

      // Re-authenticate before changing password
      const credential = EmailAuthProvider.credential(user.email, passwordCurrentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess('Password updated successfully');
      setPasswordCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="security-settings">
      <section className="email-section">
        <h2>Change Email</h2>
        <form onSubmit={handleEmailChange} noValidate>
          {emailError && (
            <div role="alert" className="error-message">
              {emailError}
            </div>
          )}
          {emailSuccess && (
            <div role="status" className="success-message">
              {emailSuccess}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="newEmail">New Email</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="emailCurrentPassword">Current Password (for email change)</label>
            <input
              id="emailCurrentPassword"
              type="password"
              value={emailCurrentPassword}
              onChange={(e) => setEmailCurrentPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={emailLoading}>
            {emailLoading ? 'Changing...' : 'Change Email'}
          </button>
        </form>
      </section>

      <section className="password-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange}>
          {passwordError && (
            <div role="alert" className="error-message">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="success-message">
              {passwordSuccess}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="passwordCurrentPassword">
              Current Password (for password change)
            </label>
            <input
              id="passwordCurrentPassword"
              type="password"
              value={passwordCurrentPassword}
              onChange={(e) => setPasswordCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={passwordLoading}>
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
