'use client';

import { useState } from 'react';
import type { Group, GroupMemberWithUser } from '@/lib/types';

interface GroupShareModalProps {
  code: string;
  qrDataUrl: string;
  onShareLink: () => void;
  onClose: () => void;
}

export function GroupShareModal({ code, qrDataUrl, onShareLink, onClose }: GroupShareModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Invite Members</h2>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Invite Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-primary-700">
            {code}
          </p>
        </div>
        {qrDataUrl && (
          <div className="flex justify-center">
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
          </div>
        )}
        <p className="text-center text-xs text-gray-500">
          Share this code or QR to invite members to your group
        </p>
        <div className="space-y-2">
          <button onClick={onShareLink} className="btn-primary">
            Share Link
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteGroupModalProps {
  groupName: string;
  upcomingEventCount: number;
  onDelete: () => void;
  onClose: () => void;
}

export function DeleteGroupModal({ groupName, upcomingEventCount, onDelete, onClose }: DeleteGroupModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center text-red-600">Delete Group</h2>
        <p className="text-center text-gray-600">
          {upcomingEventCount > 0
            ? <>Delete &ldquo;{groupName}&rdquo;? This will unlink <strong>{upcomingEventCount} upcoming event{upcomingEventCount !== 1 ? 's' : ''}</strong>, but event data will be preserved. Members can still access past events.</>
            : <>Delete &ldquo;{groupName}&rdquo;? All members will be removed. Event data from past events is preserved.</>
          }
        </p>
        <div className="space-y-2">
          <button onClick={onDelete} className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600">
            Yes, Delete Group
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface LeaveGroupModalProps {
  onLeave: () => void;
  onClose: () => void;
}

export function LeaveGroupModal({ onLeave, onClose }: LeaveGroupModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Leave Group</h2>
        <p className="text-center text-gray-600">
          Are you sure you want to leave this group? You can rejoin later with the invite code.
        </p>
        <div className="space-y-2">
          <button onClick={onLeave} className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600">
            Leave Group
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditGroupModalProps {
  name: string;
  description: string;
  maxMembers: string;
  onSave: () => void;
  onClose: () => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onMaxMembersChange: (v: string) => void;
  saving: boolean;
}

export function EditGroupModal({
  name, description, maxMembers,
  onSave, onClose,
  onNameChange, onDescriptionChange, onMaxMembersChange,
  saving,
}: EditGroupModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Edit Group</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Group Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              maxLength={200}
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Max Members</label>
            <input
              type="number"
              inputMode="numeric"
              className="input-field"
              value={maxMembers}
              onChange={(e) => onMaxMembersChange(e.target.value)}
              placeholder="No limit"
              min="2"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for no limit</p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateEventModalProps {
  group: Group & { member_count: number };
  onClose: () => void;
  onSuccess: (code: string) => void;
}

export function CreateEventModal({ group, onClose, onSuccess }: CreateEventModalProps) {
  const today = new Date();
  const defaultName = `${group.name} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const [eventName, setEventName] = useState(defaultName);
  const [scheduledAt, setScheduledAt] = useState('');
  const [numCourts, setNumCourts] = useState('2');
  const [maxPlayers, setMaxPlayers] = useState(String(Math.max(group.member_count || 0, 4)));
  const [mode, setMode] = useState<'rotating' | 'fixed'>('rotating');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!scheduledAt) {
      setError('Date and time is required');
      return;
    }

    const courts = parseInt(numCourts);
    const players = parseInt(maxPlayers);

    if (isNaN(courts) || courts < 1 || courts > 12) {
      setError('Courts must be between 1 and 12');
      return;
    }
    if (isNaN(players) || players < 4 || players > 48) {
      setError('Max players must be between 4 and 48');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName.trim(),
          num_courts: courts,
          mode,
          max_players: players,
          scheduled_at: scheduledAt,
          group_id: group.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create event');
        return;
      }
      onSuccess(data.code);
    } catch {
      setError('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Create Event</h2>

        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-sm text-primary-700">
          All {group.member_count} group member{group.member_count !== 1 ? 's' : ''} will be added automatically
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Event Name</label>
            <input
              type="text"
              className="input-field"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Date &amp; Time</label>
            <input
              type="datetime-local"
              className="input-field"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Courts</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                value={numCourts}
                onChange={(e) => setNumCourts(e.target.value)}
                min="1"
                max="12"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Max Players</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                min="4"
                max="48"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Tournament Mode</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="rotating"
                  checked={mode === 'rotating'}
                  onChange={() => setMode('rotating')}
                  className="accent-primary-700"
                />
                <span className="text-sm">Rotating Partners</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="fixed"
                  checked={mode === 'fixed'}
                  onChange={() => setMode('fixed')}
                  className="accent-primary-700"
                />
                <span className="text-sm">Fixed Partners</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface LastAdminModalProps {
  members: GroupMemberWithUser[];
  creatorId: string;
  onPromote: (memberId: string) => void;
  onClose: () => void;
  promoting: boolean;
}

export function LastAdminModal({ members, creatorId, onPromote, onClose, promoting }: LastAdminModalProps) {
  const promotable = members.filter((m) => m.user_id !== creatorId && m.role !== 'admin');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">You&apos;re the Only Admin</h2>
          <p className="text-sm text-gray-500 mt-1">
            Promote another member to admin before you can leave.
          </p>
        </div>

        {promotable.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">
              There are no other members to promote. Delete the group instead.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Choose a new admin</p>
            {promotable.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-200 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{m.display_name}</span>
                </div>
                <button
                  onClick={() => onPromote(m.id)}
                  disabled={promoting}
                  className="text-xs py-1.5 px-3 bg-primary-700 text-white font-semibold rounded-lg active:bg-primary-800 disabled:opacity-50"
                >
                  {promoting ? 'Promoting...' : 'Make Admin'}
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
