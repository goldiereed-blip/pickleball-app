'use client';

import type { MatchWithNames } from '@/lib/types';

interface MatchCardProps {
  match: MatchWithNames;
  divisionColor?: string | null;
}

export default function MatchCard({ match, divisionColor }: MatchCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span className="flex items-center gap-1">
          {divisionColor && (
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: divisionColor }}
            />
          )}
          Court {match.court_number}
        </span>
        {match.is_completed ? (
          <span className="text-primary-600 font-medium">Final</span>
        ) : (
          <span>Pending</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm">
            {match.team1_player1_name} & {match.team1_player2_name}
          </p>
        </div>
        {match.is_completed ? (
          <div className="flex items-center gap-1 mx-2">
            <span
              className={`font-bold text-lg ${
                (match.team1_score ?? 0) > (match.team2_score ?? 0)
                  ? 'text-primary-600'
                  : 'text-gray-400'
              }`}
            >
              {match.team1_score}
            </span>
            <span className="text-gray-300">-</span>
            <span
              className={`font-bold text-lg ${
                (match.team2_score ?? 0) > (match.team1_score ?? 0)
                  ? 'text-primary-600'
                  : 'text-gray-400'
              }`}
            >
              {match.team2_score}
            </span>
          </div>
        ) : (
          <span className="mx-2 text-gray-300 font-bold">vs</span>
        )}
        <div className="flex-1 text-right">
          <p className="font-medium text-sm">
            {match.team2_player1_name} & {match.team2_player2_name}
          </p>
        </div>
      </div>
    </div>
  );
}
