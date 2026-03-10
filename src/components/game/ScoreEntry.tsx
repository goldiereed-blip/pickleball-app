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

  const team1Wins = (match.team1_score ?? 0) > (match.team2_score ?? 0);
  const diff = Math.abs((match.team1_score ?? 0) - (match.team2_score ?? 0));

  const winnerNames = team1Wins
    ? `${match.team1_player1_name} & ${match.team1_player2_name}`
    : `${match.team2_player1_name} & ${match.team2_player2_name}`;
  const loserNames = team1Wins
    ? `${match.team2_player1_name} & ${match.team2_player2_name}`
    : `${match.team1_player1_name} & ${match.team1_player2_name}`;
  const winnerScore = team1Wins ? match.team1_score : match.team2_score;
  const loserScore = team1Wins ? match.team2_score : match.team1_score;

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      {/* Court header */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span className="flex items-center gap-1.5">
          {divisionColor && (
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: divisionColor }} />
          )}
          Court {match.court_number}
        </span>
        {match.is_completed && (
          <span className="text-green-600 font-medium">✅ Final</span>
        )}
      </div>

      {/* Score display or entry */}
      {isEditing && canEdit ? (
        /* Edit mode: show team names side-by-side with inputs */
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 text-center text-xs text-gray-500 mb-1">
            <span className="truncate">{match.team1_player1_name} &amp; {match.team1_player2_name}</span>
            <span className="text-gray-300">—</span>
            <span className="truncate text-right">{match.team2_player1_name} &amp; {match.team2_player2_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-3 px-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
              placeholder="0"
              value={scoreT1}
              onChange={(e) => setScoreT1(e.target.value)}
              min="0"
              max="99"
            />
            <span className="text-gray-400 font-bold text-lg">-</span>
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-3 px-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none bg-white"
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
              className="flex-1 min-h-[48px] py-2 bg-primary-600 text-white font-semibold rounded-xl active:bg-primary-700"
            >
              Save Score
            </button>
            <button
              onClick={() => setEditingMatch(null)}
              className="min-h-[48px] py-2 px-4 bg-gray-200 text-gray-600 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : match.is_completed && match.team1_score !== null && match.team2_score !== null ? (
        /* Completed: winner/loser display */
        <div className="rounded-xl overflow-hidden border border-gray-100">
          {/* Winner row */}
          <div className="bg-green-50 px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none shrink-0">🏆</span>
              <span className="font-semibold text-sm text-gray-800 truncate">{winnerNames}</span>
            </div>
            <span className="text-2xl font-bold text-green-600 shrink-0 tabular-nums">{winnerScore}</span>
          </div>
          {/* Loser row */}
          <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-sm text-gray-500 truncate pl-7">{loserNames}</span>
            <div className="flex items-center gap-2 shrink-0">
              {diff > 0 && (
                <span className="text-xs text-gray-400 font-medium">+{diff}</span>
              )}
              <span className="text-xl font-bold text-gray-400 tabular-nums">{loserScore}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Pending: show team names + enter score button */
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
            <p className="text-sm font-medium text-gray-700">
              {match.team1_player1_name} & {match.team1_player2_name}
            </p>
            <span className="text-gray-300 text-xs">vs</span>
            <p className="text-sm font-medium text-gray-700 text-right">
              {match.team2_player1_name} & {match.team2_player2_name}
            </p>
          </div>
          {canEdit ? (
            <button
              onClick={startEditing}
              className="w-full min-h-[48px] py-2 bg-primary-100 text-primary-700 font-semibold rounded-xl text-sm active:bg-primary-200"
            >
              Enter Score
            </button>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">No score yet</p>
          )}
        </div>
      )}

      {/* Edit button for completed scores */}
      {match.is_completed && !isEditing && canEdit && (
        <button
          onClick={startEditing}
          className="mt-2 w-full text-xs text-primary-600 font-medium py-1.5 px-3 border border-primary-200 rounded-lg active:bg-primary-50"
        >
          Edit Score
        </button>
      )}
    </div>
  );
}
