'use client';

import type { Game, Player, RoundWithMatches } from '@/lib/types';

interface GameHeaderProps {
  game: Game;
  code: string;
  activePlayers: Player[];
  completedMatches: number;
  totalMatches: number;
  user: { id: string; display_name: string } | null;
  onShare: () => void;
  onDelete: () => void;
}

export default function GameHeader({
  game,
  code,
  activePlayers,
  completedMatches,
  totalMatches,
  user,
  onShare,
  onDelete,
}: GameHeaderProps) {
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
              <h1 className="text-lg font-bold truncate">{game.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-primary-200 text-sm">
              <span>
                Join Code: <span className="font-mono font-bold text-white">{code}</span>
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
            Share
          </button>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-primary-200">
          <span>{activePlayers.length} players</span>
          <span>{game.num_courts} court{game.num_courts !== 1 ? 's' : ''}</span>
          <span>{game.mode === 'rotating' ? 'Rotating' : 'Fixed'} partners</span>
          {totalMatches > 0 && (
            <span>
              {completedMatches}/{totalMatches} played
            </span>
          )}
          {user && game.created_by === user.id && (
            <button
              onClick={onDelete}
              className="text-red-300 underline ml-auto"
            >
              Delete
            </button>
          )}
        </div>
        {game.scheduled_at && (
          <div className="mt-1 text-xs text-primary-200">
            {new Date(game.scheduled_at).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </header>
  );
}
