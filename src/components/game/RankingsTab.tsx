'use client';

import { useState } from 'react';
import type { Ranking, Division, TeamWithPlayers } from '@/lib/types';

interface TeamRanking {
  team_key: string;
  display_name: string;
  wins: number;
  losses: number;
  point_differential: number;
  games_played: number;
  division_id?: string | null;
}

interface RankingsTabProps {
  rankings: Ranking[];
  completedMatches: number;
  divisions: Division[];
  code: string;
  gameMode?: 'rotating' | 'fixed';
  teams?: TeamWithPlayers[];
}

const medals = ['🏆', '🥈', '🥉'];
const medalBg = [
  'bg-yellow-50 border-yellow-200',
  'bg-gray-100 border-gray-200',
  'bg-orange-50 border-orange-200',
];

/** Merge individual rankings into team rows for fixed-partners mode. */
function buildTeamRankings(rankings: Ranking[], teams: TeamWithPlayers[]): TeamRanking[] {
  const rankMap = new Map<string, Ranking>();
  for (const r of rankings) rankMap.set(r.player_id, r);

  const teamRows: TeamRanking[] = [];
  for (const t of teams) {
    const r1 = rankMap.get(t.player1_id);
    const r2 = rankMap.get(t.player2_id);
    // Use whichever player has data; both should be identical since they always co-play.
    const base = r1 ?? r2;
    if (!base) continue;
    const displayName = t.team_name || `${t.player1_name} & ${t.player2_name}`;
    teamRows.push({
      team_key: t.id,
      display_name: displayName,
      wins: base.wins,
      losses: base.losses,
      point_differential: base.point_differential,
      games_played: base.games_played,
      division_id: base.division_id,
    });
  }

  teamRows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.point_differential - a.point_differential;
  });

  return teamRows;
}

export default function RankingsTab({
  rankings,
  completedMatches,
  divisions,
  gameMode,
  teams,
}: RankingsTabProps) {
  const isFixed = gameMode === 'fixed' && teams && teams.length > 0;
  const [viewMode, setViewMode] = useState<'teams' | 'players'>('teams');
  const [scope, setScope] = useState<'division' | 'overall'>('overall');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');

  const hasDivisions = divisions.length > 0;

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

  // ── Team view (fixed partners) ──
  if (isFixed && viewMode === 'teams') {
    const teamRankings = buildTeamRankings(rankings, teams!);
    const filtered = hasDivisions && scope === 'division' && selectedDivisionId
      ? teamRankings.filter((r) => r.division_id === selectedDivisionId)
      : teamRankings;

    return (
      <div className="space-y-3">
        {/* Teams / Players toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('teams')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white"
          >
            Teams
          </button>
          <button
            onClick={() => setViewMode('players')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
          >
            Players
          </button>
        </div>

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

        <div className="space-y-2">
          {filtered.map((r, i) => (
            <div
              key={r.team_key}
              className={`rounded-2xl border px-4 py-3 ${
                i < 3 ? medalBg[i] : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 shrink-0 text-center">
                  {i < 3 ? (
                    <span className="text-2xl leading-none">{medals[i]}</span>
                  ) : (
                    <span className="text-base font-bold text-gray-400">{i + 1}.</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate text-gray-900">{r.display_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {r.wins} Win{r.wins !== 1 ? 's' : ''} &middot; {r.losses} Loss{r.losses !== 1 ? 'es' : ''} &middot; {r.games_played} played
                  </p>
                </div>
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

  // ── Individual / rotating view ──
  const filteredRankings = hasDivisions && scope === 'division' && selectedDivisionId
    ? rankings.filter((r) => r.division_id === selectedDivisionId)
    : rankings;

  return (
    <div className="space-y-3">
      {/* Teams / Players toggle (fixed mode only) */}
      {isFixed && (
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('teams')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
          >
            Teams
          </button>
          <button
            onClick={() => setViewMode('players')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white"
          >
            Players
          </button>
        </div>
      )}

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

      <div className="space-y-2">
        {filteredRankings.map((r, i) => (
          <div
            key={r.player_id}
            className={`rounded-2xl border px-4 py-3 ${
              i < 3 ? medalBg[i] : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 shrink-0 text-center">
                {i < 3 ? (
                  <span className="text-2xl leading-none">{medals[i]}</span>
                ) : (
                  <span className="text-base font-bold text-gray-400">{i + 1}.</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate text-gray-900">{r.player_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {r.wins} Win{r.wins !== 1 ? 's' : ''} &middot; {r.losses} Loss{r.losses !== 1 ? 'es' : ''} &middot; {r.games_played} played
                </p>
              </div>
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
