'use client';

import type { Player, RoundWithMatches, MatchWithNames } from '@/lib/types';

interface MyGamesTabProps {
  players: Player[];
  rounds: RoundWithMatches[];
  deviceId: string;
  claimedPlayerId: string | null;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
}

export default function MyGamesTab({
  players,
  rounds,
  deviceId,
  claimedPlayerId,
  selectedPlayerId,
  setSelectedPlayerId,
}: MyGamesTabProps) {
  const getPlayerMatches = (playerId: string) => {
    const past: (MatchWithNames & { roundNum: number })[] = [];
    const upcoming: (MatchWithNames & { roundNum: number })[] = [];
    for (const round of rounds) {
      for (const match of round.matches) {
        const isInMatch =
          match.team1_player1_id === playerId ||
          match.team1_player2_id === playerId ||
          match.team2_player1_id === playerId ||
          match.team2_player2_id === playerId;
        if (isInMatch) {
          if (match.is_completed) {
            past.push({ ...match, roundNum: round.round_number });
          } else {
            upcoming.push({ ...match, roundNum: round.round_number });
          }
        }
      }
    }
    return { past, upcoming };
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">View Games For</h3>
        <select
          className="input-field"
          value={selectedPlayerId || ''}
          onChange={(e) => setSelectedPlayerId(e.target.value || null)}
        >
          <option value="">Select a player...</option>
          {players.filter((p) => p.is_playing).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.claimed_by === deviceId ? ' (You)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedPlayerId && (() => {
        const { past, upcoming } = getPlayerMatches(selectedPlayerId);
        return (
          <>
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">
                Upcoming Games ({upcoming.length})
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400">No upcoming games</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((match) => (
                    <div key={match.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Round {match.roundNum} — Court {match.court_number}</span>
                        <span className="text-amber-600 font-medium">Upcoming</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {match.team1_player1_name} & {match.team1_player2_name}
                          </p>
                        </div>
                        <span className="mx-2 text-gray-300 font-bold">vs</span>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-sm">
                            {match.team2_player1_name} & {match.team2_player2_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">
                Past Games ({past.length})
              </h3>
              {past.length === 0 ? (
                <p className="text-sm text-gray-400">No completed games yet</p>
              ) : (
                <div className="space-y-2">
                  {past.map((match) => {
                    const isTeam1 =
                      match.team1_player1_id === selectedPlayerId ||
                      match.team1_player2_id === selectedPlayerId;
                    const myScore = isTeam1 ? match.team1_score : match.team2_score;
                    const theirScore = isTeam1 ? match.team2_score : match.team1_score;
                    const won = (myScore ?? 0) > (theirScore ?? 0);

                    return (
                      <div key={match.id} className={`rounded-lg p-3 ${won ? 'bg-primary-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Round {match.roundNum} — Court {match.court_number}</span>
                          <span className={`font-medium ${won ? 'text-primary-600' : 'text-red-500'}`}>
                            {won ? 'Won' : 'Lost'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {match.team1_player1_name} & {match.team1_player2_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mx-2">
                            <span className={`font-bold text-lg ${
                              (match.team1_score ?? 0) > (match.team2_score ?? 0) ? 'text-primary-600' : 'text-gray-400'
                            }`}>
                              {match.team1_score}
                            </span>
                            <span className="text-gray-300">-</span>
                            <span className={`font-bold text-lg ${
                              (match.team2_score ?? 0) > (match.team1_score ?? 0) ? 'text-primary-600' : 'text-gray-400'
                            }`}>
                              {match.team2_score}
                            </span>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="font-medium text-sm">
                              {match.team2_player1_name} & {match.team2_player2_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {!selectedPlayerId && (
        <div className="card text-center py-8">
          <p className="text-gray-500">Select a player to view their games</p>
          {!claimedPlayerId && (
            <p className="text-sm text-gray-400 mt-1">
              Tip: Claim your player spot in the Players tab to auto-select
            </p>
          )}
        </div>
      )}
    </div>
  );
}
