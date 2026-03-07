'use client';

import type { Group } from '@/lib/types';

interface GroupHeaderProps {
  group: Group;
  code: string;
  memberCount: number;
  isAdmin: boolean;
  isCreator: boolean;
  onShare: () => void;
  onDelete: () => void;
}

export default function GroupHeader({
  group,
  code,
  memberCount,
  isAdmin,
  isCreator,
  onShare,
  onDelete,
}: GroupHeaderProps) {
  const copyCode = () => {
    navigator.clipboard?.writeText(code);
  };

  return (
    <header className="bg-primary-700 text-white px-4 py-3 safe-top">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a href="/" className="text-primary-200 hover:text-white text-sm shrink-0">
                &larr; Home
              </a>
              <h1 className="text-lg font-bold truncate">{group.name}</h1>
            </div>
            {group.description && (
              <p className="text-primary-200 text-sm truncate mt-0.5">{group.description}</p>
            )}
            <div className="flex items-center gap-2 text-primary-200 text-sm mt-1">
              <span>
                Invite Code: <span className="font-mono font-bold text-white">{code}</span>
              </span>
              <button onClick={copyCode} className="underline text-xs">
                Copy
              </button>
            </div>
          </div>
          <button
            onClick={onShare}
            className="ml-2 py-2 px-3 bg-primary-600 rounded-lg text-sm font-medium active:bg-primary-800"
          >
            Invite
          </button>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-primary-200">
          <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          {group.max_members && (
            <span>Max {group.max_members}</span>
          )}
          {isCreator && (
            <button
              onClick={onDelete}
              className="text-red-300 underline ml-auto"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
