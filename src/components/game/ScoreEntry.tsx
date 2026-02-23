'use client';

import type { MatchWithNames } from '@/lib/types';

interface ScoreEntryProps {
  match: MatchWithNames;
  editingMatch: string | null;
  scoreT1: string;
  scoreT2: string;
  setEditingMatch: (id: string | null) => void;
  setScoreT1: (s: string) => void;
  setScoreT2: (s: string) => void;
  submitScore: (id: string) => void;
  divisionColor?: string | null;
  canEdit?: boolean;
}

export default function ScoreEntry({
  match,
  editingMatch,
  scoreT1,
  scoreT2,
  setEditingMatch,
  setScoreT1,
  setScoreT2,
  submitScore,
  divisionColor,
  canEdit = true,
}: ScoreEntryProps) {
  const isEditing = editingMatch === match.id;

  const startEditing = () => {
    setEditingMatch(match.id);
    setScoreT1(match.is_completed ? String(match.team1_score) : '');
    setScoreT2(match.is_completed ? String(match.team2_score) : '');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span className="flex items-center gap-1">
          {divisionColor && (
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: divisionColor }}
            />
          )}
          Court {match.court_number}
        </span>
        {match.is_completed && (
          <span className="text-primary-600 font-medium">Recorded</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
        <div>
          <p className="font-medium text-sm">
            {match.team1_player1_name} & {match.team1_player2_name}
          </p>
        </div>
        <span className="text-gray-300 text-xs">vs</span>
        <div className="text-right">
          <p className="font-medium text-sm">
            {match.team2_player1_name} & {match.team2_player2_name}
          </p>
        </div>
      </div>

      {isEditing && canEdit ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-2 px-3 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="0"
              value={scoreT1}
              onChange={(e) => setScoreT1(e.target.value)}
              min="0"
              max="99"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-2 px-3 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="0"
              value={scoreT2}
              onChange={(e) => setScoreT2(e.target.value)}
              min="0"
              max="99"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => submitScore(match.id)}
              className="flex-1 py-2 bg-primary-600 text-white font-semibold rounded-lg active:bg-primary-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditingMatch(null)}
              className="py-2 px-4 bg-gray-200 text-gray-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          {match.is_completed ? (
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                <span
                  className={
                    (match.team1_score ?? 0) > (match.team2_score ?? 0)
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  }
                >
                  {match.team1_score}
                </span>
                <span className="text-gray-300 mx-1">-</span>
                <span
                  className={
                    (match.team2_score ?? 0) > (match.team1_score ?? 0)
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  }
                >
                  {match.team2_score}
                </span>
              </span>
              {canEdit && (
                <button
                  onClick={startEditing}
                  className="text-xs text-primary-600 font-medium py-1 px-3 border border-primary-200 rounded-lg"
                >
                  Edit
                </button>
              )}
            </div>
          ) : canEdit ? (
            <button
              onClick={startEditing}
              className="w-full py-2 bg-primary-100 text-primary-700 font-medium rounded-lg text-sm active:bg-primary-200"
            >
              Enter Score
            </button>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">No score yet</p>
          )}
        </div>
      )}
    </div>
  );
}
