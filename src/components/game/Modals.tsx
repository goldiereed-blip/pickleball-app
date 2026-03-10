'use client';

import type { Game, Player } from '@/lib/types';

interface RoundConfirmModalProps {
  activePlayers: Player[];
  game: Game;
  suggestedRounds: number;
  selectedRounds: number;
  setSelectedRounds: (n: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function RoundConfirmModal({
  activePlayers,
  game,
  suggestedRounds,
  selectedRounds,
  setSelectedRounds,
  onConfirm,
  onClose,
}: RoundConfirmModalProps) {
  const n = activePlayers.length;
  const maxCourts = Math.min(game.num_courts, Math.floor(n / 4));
  const activePlayersPerRound = maxCourts * 4;
  const hasByes = n > game.num_courts * 4;
  const byesPerRound = hasByes ? n - activePlayersPerRound : 0;
  const approxGamesPerPlayer = Math.round((selectedRounds * activePlayersPerRound) / n);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Confirm Rounds</h2>

        {/* Round picker */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">
            Recommended: <span className="font-bold text-primary-700">{suggestedRounds}</span> rounds
            &nbsp;&mdash; each player faces everyone twice
          </p>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Number of Rounds
          </label>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSelectedRounds(Math.max(1, selectedRounds - 1))}
              className="w-12 h-12 rounded-xl bg-gray-200 text-xl font-bold active:bg-gray-300 select-none"
            >
              -
            </button>
            <span className="text-3xl font-bold text-primary-700 w-16 text-center">
              {selectedRounds}
            </span>
            <button
              onClick={() => setSelectedRounds(Math.min(50, selectedRounds + 1))}
              className="w-12 h-12 rounded-xl bg-gray-200 text-xl font-bold active:bg-gray-300 select-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Players active per round</span>
            <span className="font-medium">{activePlayersPerRound} of {n}</span>
          </div>
          {hasByes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sitting out per round</span>
              <span className="font-medium">{byesPerRound}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Est. games per player</span>
            <span className="font-medium">~{approxGamesPerPlayer}</span>
          </div>
        </div>

        {hasByes && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
            With {byesPerRound} player{byesPerRound !== 1 ? 's' : ''} sitting out each round, perfect distribution is hard to guarantee. This recommendation gets everyone close to facing each opponent twice.
          </p>
        )}

        <p className="text-xs text-gray-400 text-center">
          This will lock the player list and start the tournament
        </p>
        <div className="space-y-2">
          <button onClick={onConfirm} className="btn-primary">
            Start with {selectedRounds} Rounds
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  gameName: string;
  onDelete: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({ gameName, onDelete, onClose }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center text-red-600">Delete Game</h2>
        <p className="text-center text-gray-600">
          Are you sure you want to delete &ldquo;{gameName}&rdquo;? This will permanently remove all players, schedules, and scores.
        </p>
        <div className="space-y-2">
          <button onClick={onDelete} className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600">
            Yes, Delete Game
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface ShareModalProps {
  code: string;
  qrDataUrl: string;
  onShareLink: () => void;
  onClose: () => void;
}

export function ShareModal({ code, qrDataUrl, onShareLink, onClose }: ShareModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Share Game</h2>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Join Code</p>
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
          Scan this QR code or enter the join code to join
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

interface ReopenConfirmModalProps {
  onReopen: () => void;
  onClose: () => void;
}

export function ReopenConfirmModal({ onReopen, onClose }: ReopenConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center text-amber-600">Reopen Game</h2>
        <p className="text-center text-gray-600">
          Are you sure you want to reopen this game? The current schedule will be cleared and you&apos;ll need to start again.
        </p>
        <p className="text-center text-xs text-gray-400">
          Players will be kept. New players can join and the schedule will be regenerated when you start again.
        </p>
        <div className="space-y-2">
          <button onClick={onReopen} className="w-full py-3 bg-amber-500 text-white font-semibold rounded-xl active:bg-amber-600">
            Reopen Game
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditSettingsModalProps {
  game: Game;
  courts: string;
  maxPlayers: string;
  saving: boolean;
  error: string;
  hasScores: boolean;
  onCourtsChange: (v: string) => void;
  onMaxPlayersChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditSettingsModal({
  game, courts, maxPlayers, saving, error, hasScores,
  onCourtsChange, onMaxPlayersChange, onSave, onClose,
}: EditSettingsModalProps) {
  const isStarted = !!game.started;
  const willRegen = isStarted && !hasScores;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Edit Game Settings</h2>

        {hasScores && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-sm text-red-700 font-medium">
              Settings are locked after scores have been entered.
            </p>
          </div>
        )}

        {!hasScores && willRegen && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">
              Changing courts will clear and regenerate the schedule with the new court count.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Courts
            </label>
            <p className="text-xs text-gray-400 mb-1">Current: {game.num_courts}</p>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={courts}
              onChange={(e) => onCourtsChange(e.target.value)}
              disabled={hasScores || saving}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Players
            </label>
            <p className="text-xs text-gray-400 mb-1">Current: {game.max_players}</p>
            <input
              type="number"
              inputMode="numeric"
              min={4}
              max={48}
              value={maxPlayers}
              onChange={(e) => onMaxPlayersChange(e.target.value)}
              disabled={hasScores || saving}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="space-y-2">
          {!hasScores && (
            <button
              onClick={onSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : willRegen
                ? 'Save & Regenerate Schedule'
                : 'Save Changes'}
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="btn-secondary">
            {hasScores ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExitConfirmModalProps {
  onSaveAndExit: () => void;
  onDeleteAndExit: () => void;
  onClose: () => void;
}

export function ExitConfirmModal({ onSaveAndExit, onDeleteAndExit, onClose }: ExitConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-center">Leave Game</h2>
        <p className="text-center text-gray-600">
          What would you like to do with this game?
        </p>
        <div className="space-y-2">
          <button onClick={onSaveAndExit} className="btn-primary">
            Save & Exit
          </button>
          <button onClick={onDeleteAndExit} className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600">
            Delete Game
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
