'use client';

import type { RoundWithMatches, Division } from '@/lib/types';
import MatchCard from './MatchCard';

interface ScheduleTabProps {
  rounds: RoundWithMatches[];
  divisions: Division[];
}

export default function ScheduleTab({ rounds, divisions }: ScheduleTabProps) {
  const getDivisionColor = (divisionId: string | null | undefined) => {
    if (!divisionId) return null;
    return divisions.find((d) => d.id === divisionId)?.color ?? null;
  };

  if (rounds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <p className="text-gray-500">No schedule generated yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add players and start the round robin from the Players tab
          </p>
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
          <div className="space-y-2">
            {round.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                divisionColor={getDivisionColor(match.division_id)}
              />
            ))}
          </div>
          {round.sitting.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Sitting out: {round.sitting.join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
