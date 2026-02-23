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
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">
            Based on {activePlayers.length} players and {game.num_courts} court{game.num_courts !== 1 ? 's' : ''},
            we suggest <span className="font-bold text-primary-700">{suggestedRounds}</span> rounds.
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
