'use client';

import type { RoundWithMatches, Division } from '@/lib/types';
import ScoreEntry from './ScoreEntry';

interface ScoresTabProps {
  rounds: RoundWithMatches[];
  divisions: Division[];
  editingMatch: string | null;
  scoreT1: string;
  scoreT2: string;
  setEditingMatch: (id: string | null) => void;
  setScoreT1: (s: string) => void;
  setScoreT2: (s: string) => void;
  submitScore: (id: string) => void;
  canEdit?: boolean;
}

export default function ScoresTab({
  rounds,
  divisions,
  editingMatch,
  scoreT1,
  scoreT2,
  setEditingMatch,
  setScoreT1,
  setScoreT2,
  submitScore,
  canEdit = true,
}: ScoresTabProps) {
  const getDivisionColor = (divisionId: string | null | undefined) => {
    if (!divisionId) return null;
    return divisions.find((d) => d.id === divisionId)?.color ?? null;
  };

  if (rounds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <p className="text-gray-500">No schedule generated yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={round.round_id} className="card">
          <h3 className="font-bold text-primary-700 mb-3">
            Round {round.round_number}
            {round.division_name && (
              <span
                className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: getDivisionColor(round.division_id) || '#854AAF' }}
              >
                {round.division_name}
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {round.matches.map((match) => (
              <ScoreEntry
                key={match.id}
                match={match}
                editingMatch={editingMatch}
                scoreT1={scoreT1}
                scoreT2={scoreT2}
                setEditingMatch={setEditingMatch}
                setScoreT1={setScoreT1}
                setScoreT2={setScoreT2}
                submitScore={submitScore}
                divisionColor={getDivisionColor(match.division_id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
