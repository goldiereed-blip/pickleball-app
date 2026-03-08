'use client';

import type { Game } from '@/lib/types';

interface GameHeaderProps {
  game: Game;
  code: string;
  activePlayers: { length: number };
  completedMatches: number;
  totalMatches: number;
  onShare: () => void;
}

export default function GameHeader({
  game,
  code,
  activePlayers,
  completedMatches,
  totalMatches,
  onShare,
}: GameHeaderProps) {
  const copyCode = () => {
    navigator.clipboard?.writeText(code);
  };

  const progressPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  const statusLabel = game.is_complete ? 'Complete' : game.started ? 'In Progress' : 'Not Started';
  const statusClass = game.is_complete
    ? 'bg-gray-500/30 text-gray-200'
    : game.started
    ? 'bg-green-500/30 text-green-200'
    : 'bg-amber-500/30 text-amber-200';

  return (
    <header className="bg-primary-700 text-white px-4 pt-3 pb-3 safe-top">
      <div className="max-w-lg mx-auto space-y-2">

        {/* Row 1: Game name + Share */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold truncate leading-tight flex-1">{game.name}</h1>
          <button
            onClick={onShare}
            className="shrink-0 py-1.5 px-3 bg-primary-600 rounded-lg text-sm font-medium active:bg-primary-800"
          >
            Share
          </button>
        </div>

        {/* Row 2: Status + code + stats */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-primary-200">
          <span className={`px-1.5 py-0.5 rounded font-medium ${statusClass}`}>
            {statusLabel}
          </span>
          <button onClick={copyCode} className="flex items-center gap-1">
            <span>Code:</span>
            <span className="font-mono font-bold text-white">{code}</span>
            <span className="text-primary-300 underline">Copy</span>
          </button>
          <span>{activePlayers.length}/{game.max_players || 48} players</span>
          <span>{game.num_courts} court{game.num_courts !== 1 ? 's' : ''}</span>
          <span>{game.mode === 'rotating' ? 'Rotating' : 'Fixed'}</span>
        </div>

        {/* Row 3: Date */}
        {game.scheduled_at && (
          <p className="text-xs text-primary-200">
            {'\ud83d\udcc5'}{' '}
            {new Date(game.scheduled_at).toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}

        {/* Row 4: Progress bar */}
        {totalMatches > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-primary-200 mb-1">
              <span>{completedMatches}/{totalMatches} games played</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-primary-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
