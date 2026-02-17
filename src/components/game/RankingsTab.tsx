'use client';

import { useState } from 'react';
import type { Ranking, Division } from '@/lib/types';

interface RankingsTabProps {
  rankings: Ranking[];
  completedMatches: number;
  divisions: Division[];
  code: string;
}

export default function RankingsTab({ rankings, completedMatches, divisions, code }: RankingsTabProps) {
  const [scope, setScope] = useState<'division' | 'overall'>('overall');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');

  const hasDivisions = divisions.length > 0;

  // Filter rankings by division if applicable
  const filteredRankings = hasDivisions && scope === 'division' && selectedDivisionId
    ? rankings.filter((r) => r.division_id === selectedDivisionId)
    : rankings;

  if (rankings.length === 0 || completedMatches === 0) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {rankings.length === 0
              ? 'No players yet'
              : 'No scores entered yet. Enter scores to see rankings.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Division/Overall toggle */}
      {hasDivisions && (
        <div className="card space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setScope('overall')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                scope === 'overall' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setScope('division')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b">
              <th className="text-left py-2 pr-2">#</th>
              <th className="text-left py-2">Player</th>
              {hasDivisions && scope === 'overall' && (
                <th className="text-left py-2 px-1">Div</th>
              )}
              <th className="text-center py-2 px-1">W</th>
              <th className="text-center py-2 px-1">L</th>
              <th className="text-center py-2 px-1">+/-</th>
              <th className="text-center py-2 px-1">GP</th>
            </tr>
          </thead>
          <tbody>
            {filteredRankings.map((r, i) => (
              <tr
                key={r.player_id}
                className={`border-b last:border-0 ${
                  i === 0 && r.wins > 0 ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="py-2 pr-2 font-bold text-gray-400">
                  {i + 1}
                </td>
                <td className="py-2 font-medium">
                  {r.player_name}
                  {i === 0 && r.wins > 0 && scope === 'overall' && ' \ud83c\udfc6'}
                  {i === 0 && r.wins > 0 && scope === 'division' && ' \ud83c\udfc5'}
                </td>
                {hasDivisions && scope === 'overall' && (
                  <td className="py-2 px-1 text-xs">
                    {r.division_name || '-'}
                  </td>
                )}
                <td className="text-center py-2 px-1 text-primary-600 font-semibold">
                  {r.wins}
                </td>
                <td className="text-center py-2 px-1 text-red-500">
                  {r.losses}
                </td>
                <td
                  className={`text-center py-2 px-1 font-medium ${
                    r.point_differential > 0
                      ? 'text-primary-600'
                      : r.point_differential < 0
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}
                >
                  {r.point_differential > 0 ? '+' : ''}
                  {r.point_differential}
                </td>
                <td className="text-center py-2 px-1 text-gray-400">
                  {r.games_played}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-gray-400 mt-2 pt-2 border-t">
          W=Wins, L=Losses, +/-=Point Differential, GP=Games Played
        </div>
      </div>
    </div>
  );
}
