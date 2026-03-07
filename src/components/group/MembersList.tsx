'use client';

import type { GroupMemberWithUser } from '@/lib/types';

interface MembersListProps {
  members: GroupMemberWithUser[];
  isAdmin: boolean;
  currentUserId: string;
  creatorId: string;
  onToggleAdmin: (memberId: string, currentRole: string) => void;
  onRemoveMember: (memberId: string, name: string) => void;
}

export default function MembersList({
  members,
  isAdmin,
  currentUserId,
  creatorId,
  onToggleAdmin,
  onRemoveMember,
}: MembersListProps) {
  return (
    <div className="card space-y-2">
      <h3 className="font-semibold text-gray-700">Members ({members.length})</h3>
      {members.map((m) => {
        const isCreator = m.user_id === creatorId;
        const isSelf = m.user_id === currentUserId;

        return (
          <div
            key={m.id}
            className={`rounded-lg p-3 flex items-center justify-between ${
              isSelf ? 'bg-primary-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-200 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                {m.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{m.display_name}</span>
                  {isSelf && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full shrink-0">You</span>
                  )}
                  {isCreator && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">Creator</span>
                  )}
                  {m.role === 'admin' && !isCreator && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">Admin</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Joined {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {/* Admin controls — cannot modify self or creator */}
            {isAdmin && !isSelf && !isCreator && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onToggleAdmin(m.id, m.role)}
                  className="text-xs py-1 px-2 rounded-lg bg-gray-200 text-gray-600 active:bg-gray-300"
                >
                  {m.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button
                  onClick={() => onRemoveMember(m.id, m.display_name)}
                  className="text-xs py-1 px-2 rounded-lg bg-red-50 text-red-600 active:bg-red-100"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
