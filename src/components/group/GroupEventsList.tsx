'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { GroupEvent } from '@/lib/types';

interface GroupEventsListProps {
  events: GroupEvent[];
  emptyMessage: string;
  onUpdate?: () => void;
}

export default function GroupEventsList({ events, emptyMessage, onUpdate }: GroupEventsListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleJoin(game: GroupEvent) {
    if (!user || loading) return;
    setLoading(game.id + 'join');
    try {
      const res = await fetch(`/api/games/${game.code}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.display_name }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to join game');
        return;
      }
      onUpdate?.();
    } finally {
      setLoading(null);
    }
  }

  async function handleLeave(game: GroupEvent) {
    if (!game.my_player_id || loading) return;
    setLoading(game.id + 'leave');
    try {
      const res = await fetch(`/api/games/${game.code}/players/${game.my_player_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to leave game');
        return;
      }
      onUpdate?.();
    } finally {
      setLoading(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((game) => {
        const isFull = game.spots_filled >= game.max_players;
        const hasWaitlist = game.waitlist_count > 0;
        const canAct = !game.started && !game.is_complete;
        const isOnWaitlist = game.my_player_id !== null && game.my_is_playing === 0;
        const isActive = game.my_player_id !== null && game.my_is_playing === 1;
        const isLoading = loading?.startsWith(game.id);

        let spotLabel: string;
        if (isOnWaitlist) {
          spotLabel = `Waitlist #${game.my_waitlist_position}`;
        } else if (!isFull) {
          spotLabel = `${game.spots_filled}/${game.max_players} spots filled`;
        } else if (hasWaitlist) {
          spotLabel = `FULL — ${game.waitlist_count} on waitlist`;
        } else {
          spotLabel = `FULL — ${game.max_players}/${game.max_players}`;
        }

        return (
          <div key={game.id} className="card space-y-3">
            <button
              onClick={() => router.push(`/game/${game.code}`)}
              className="w-full text-left flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{game.name}</p>
                <p className="text-xs text-gray-500">
                  {game.is_complete
                    ? 'Completed'
                    : game.started
                    ? 'In Progress'
                    : 'Not Started'}
                  {game.scheduled_at &&
                    ` — ${new Date(game.scheduled_at).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{spotLabel}</p>
              </div>
              <span className="font-mono text-xs text-primary-700 font-bold shrink-0 ml-2">{game.code}</span>
            </button>

            {canAct && (
              <div className="pt-1 border-t border-gray-100">
                {!game.my_player_id && (
                  <button
                    onClick={() => handleJoin(game)}
                    disabled={!!isLoading}
                    className="w-full min-h-[48px] py-2 text-sm font-semibold rounded-xl transition-colors bg-primary-700 text-white active:bg-primary-800 disabled:opacity-50"
                  >
                    {isLoading ? 'Joining...' : isFull ? 'Join Waitlist' : 'Join Game'}
                  </button>
                )}
                {isActive && (
                  <button
                    onClick={() => handleLeave(game)}
                    disabled={!!isLoading}
                    className="w-full min-h-[48px] py-2 text-sm font-semibold rounded-xl transition-colors bg-red-50 text-red-700 border border-red-200 active:bg-red-100 disabled:opacity-50"
                  >
                    {isLoading ? 'Leaving...' : 'Leave Game'}
                  </button>
                )}
                {isOnWaitlist && (
                  <button
                    onClick={() => handleLeave(game)}
                    disabled={!!isLoading}
                    className="w-full min-h-[48px] py-2 text-sm font-semibold rounded-xl transition-colors bg-gray-100 text-gray-600 border border-gray-200 active:bg-gray-200 disabled:opacity-50"
                  >
                    {isLoading ? 'Leaving...' : `Leave Waitlist (Waitlist #${game.my_waitlist_position})`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
