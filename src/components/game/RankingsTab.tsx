'use client';

import { useState } from 'react';
import type { Ranking, Division } from '@/lib/types';

interface RankingsTabProps {
  rankings: Ranking[];
  completedMatches: number;
  divisions: Division[];
  code: string;
}

const medals = ['🏆', '🥈', '🥉'];
const medalBg = [
  'bg-yellow-50 border-yellow-200',
  'bg-gray-100 border-gray-200',
  'bg-orange-50 border-orange-200',
];

export default function RankingsTab({ rankings, completedMatches, divisions }: RankingsTabProps) {
  const [scope, setScope] = useState<'division' | 'overall'>('overall');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');

  const hasDivisions = divisions.length > 0;

  const filteredRankings = hasDivisions && scope === 'division' && selectedDivisionId
    ? rankings.filter((r) => r.division_id === selectedDivisionId)
    : rankings;

  if (rankings.length === 0 || completedMatches === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">
          {rankings.length === 0
            ? 'No players yet'
            : 'No scores entered yet — enter scores to see rankings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Division/Overall toggle */}
      {hasDivisions && (
        <div className="card space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setScope('overall')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                scope === 'overall' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setScope('division')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                scope === 'division' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              By Division
            </button>
          </div>
          {scope === 'division' && (
            <select
              className="input-field"
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
            >
              <option value="">Select division...</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Rankings cards */}
      <div className="space-y-2">
        {filteredRankings.map((r, i) => (
          <div
            key={r.player_id}
            className={`rounded-2xl border px-4 py-3 ${
              i < 3 ? medalBg[i] : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank / Medal */}
              <div className="w-8 shrink-0 text-center">
                {i < 3 ? (
                  <span className="text-2xl leading-none">{medals[i]}</span>
                ) : (
                  <span className="text-base font-bold text-gray-400">{i + 1}.</span>
                )}
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate text-gray-900">{r.player_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {r.wins} Win{r.wins !== 1 ? 's' : ''} &middot; {r.losses} Loss{r.losses !== 1 ? 'es' : ''} &middot; {r.games_played} played
                </p>
              </div>

              {/* Point differential */}
              <div
                className={`text-xl font-bold tabular-nums shrink-0 ${
                  r.point_differential > 0
                    ? 'text-green-600'
                    : r.point_differential < 0
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}
              >
                {r.point_differential > 0 ? '+' : ''}{r.point_differential}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
