'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [nameStatus, setNameStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email);
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const saveName = async () => {
    setSaving('name');
    setNameStatus(null);
    const result = await updateProfile({ first_name: firstName, last_name: lastName });
    if (result.error) {
      setNameStatus({ type: 'error', msg: result.error });
    } else {
      setNameStatus({ type: 'success', msg: 'Name updated!' });
    }
    setSaving('');
  };

  const saveEmail = async () => {
    setSaving('email');
    setEmailStatus(null);
    const result = await updateProfile({ email });
    if (result.error) {
      setEmailStatus({ type: 'error', msg: result.error });
    } else {
      setEmailStatus({ type: 'success', msg: 'Email updated!' });
    }
    setSaving('');
  };

  const savePassword = async () => {
    setPasswordStatus(null);
    if (newPassword !== newPasswordConfirm) {
      setPasswordStatus({ type: 'error', msg: 'New passwords do not match' });
      return;
    }
    setSaving('password');
    const result = await updateProfile({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    if (result.error) {
      setPasswordStatus({ type: 'error', msg: result.error });
    } else {
      setPasswordStatus({ type: 'success', msg: 'Password updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    }
    setSaving('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/')} className="font-medium">
            &larr; Home
          </button>
          <h1 className="text-lg font-bold">Profile</h1>
          <button onClick={() => { logout(); router.push('/login'); }} className="font-medium text-sm">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Name Section */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Name</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          {nameStatus && (
            <p className={`text-sm ${nameStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {nameStatus.msg}
            </p>
          )}
          <button
            onClick={saveName}
            disabled={saving === 'name'}
            className="btn-secondary"
          >
            {saving === 'name' ? 'Saving...' : 'Save Name'}
          </button>
        </div>

        {/* Email Section */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Email</h3>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          {emailStatus && (
            <p className={`text-sm ${emailStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {emailStatus.msg}
            </p>
          )}
          <button
            onClick={saveEmail}
            disabled={saving === 'email'}
            className="btn-secondary"
          >
            {saving === 'email' ? 'Saving...' : 'Save Email'}
          </button>
        </div>

        {/* Password Section */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Change Password</h3>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="At least 6 characters"
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="input-field"
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>
          {passwordStatus && (
            <p className={`text-sm ${passwordStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {passwordStatus.msg}
            </p>
          )}
          <button
            onClick={savePassword}
            disabled={saving === 'password' || !currentPassword || !newPassword}
            className="btn-secondary"
          >
            {saving === 'password' ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
