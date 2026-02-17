'use client';

import { useState } from 'react';
import type { Game, Player, Division } from '@/lib/types';
import { isHostOrCohost } from '@/lib/permissions';

interface TeamPairing {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  team_name: string | null;
}

interface PlayersTabProps {
  game: Game;
  code: string;
  players: Player[];
  activePlayers: Player[];
  teams: TeamPairing[];
  divisions: Division[];
  isStarted: boolean;
  deviceId: string;
  claimedPlayerId: string | null;
  currentPlayer: Player | null;
  generatingSchedule: boolean;
  onFetchData: () => void;
  onStartRoundRobin: () => void;
  onGenerateSchedule: () => void;
  onClaimPlayer: (playerId: string) => void;
}

export default function PlayersTab({
  game,
  code,
  players,
  activePlayers,
  teams,
  divisions,
  isStarted,
  deviceId,
  claimedPlayerId,
  currentPlayer,
  generatingSchedule,
  onFetchData,
  onStartRoundRobin,
  onGenerateSchedule,
  onClaimPlayer,
}: PlayersTabProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [teamPlayer1, setTeamPlayer1] = useState('');
  const [teamPlayer2, setTeamPlayer2] = useState('');

  const pairedPlayerIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));
  const unpairedPlayers = activePlayers.filter((p) => !pairedPlayerIds.has(p.id));
  const allPaired = game.mode === 'fixed' && activePlayers.length >= 4 && activePlayers.length % 2 === 0 && unpairedPlayers.length === 0;
  const canManage = currentPlayer ? isHostOrCohost(currentPlayer) : true;

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setAddingPlayer(true);
    try {
      const res = await fetch(`/api/games/${code}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewPlayerName('');
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const togglePlaying = async (playerId: string, currentlyPlaying: number) => {
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_playing: currentlyPlaying ? 0 : 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update player');
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!confirm('Remove this player?')) return;
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove player');
    }
  };

  const toggleHere = async (playerId: string, currentIsHere: number) => {
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_here: currentIsHere ? 0 : 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update check-in');
    }
  };

  const createTeam = async () => {
    if (!teamPlayer1 || !teamPlayer2) return;
    try {
      const res = await fetch(`/api/games/${code}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1_id: teamPlayer1, player2_id: teamPlayer2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeamPlayer1('');
      setTeamPlayer2('');
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create team');
    }
  };

  const removeTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/games/${code}/teams`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove team');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'host') return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">Host</span>;
    if (role === 'cohost') return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none">Co-host</span>;
    return null;
  };

  const getDivisionBadge = (divisionId: string | null) => {
    if (!divisionId) return null;
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return null;
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded-full text-white leading-none"
        style={{ backgroundColor: div.color }}
      >
        {div.name}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Add player form - only show if not started */}
      {!isStarted && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Add Player</h3>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              maxLength={30}
            />
            <button
              onClick={addPlayer}
              disabled={addingPlayer || !newPlayerName.trim()}
              className="py-3 px-5 bg-primary-600 text-white font-semibold rounded-xl
                         active:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {players.length}/48 players
          </p>
        </div>
      )}

      {isStarted && (
        <div className="card text-center py-3">
          <p className="text-sm text-primary-700 font-medium">
            Tournament in progress — player list is locked
          </p>
        </div>
      )}

      {/* Player list */}
      {players.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-gray-700 mb-2">
            Players ({activePlayers.length} active)
          </h3>
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-lg p-3 ${
                p.is_playing ? 'bg-primary-50' : 'bg-gray-50 opacity-60'
              }`}
            >
              {/* Row 1: Number + Name + Badges */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400 w-5 shrink-0 text-center">{i + 1}</span>
                <span className={`font-medium text-base ${p.is_playing ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                  {p.name}
                </span>
                {p.claimed_by === deviceId && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">You</span>
                )}
                {p.claimed_by && p.claimed_by !== deviceId && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none shrink-0">Claimed</span>
                )}
                {getRoleBadge(p.role)}
              </div>

              {/* Row 2: Division badge + Here badge + Action buttons */}
              <div className="flex items-center justify-between ml-7">
                {/* Left: status badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getDivisionBadge(p.division_id)}
                  {p.is_here ? (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full leading-none">Here</span>
                  ) : null}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Check-in toggle */}
                  {(p.claimed_by === deviceId || canManage) && (
                    <button
                      onClick={() => toggleHere(p.id, p.is_here)}
                      className={`min-h-[36px] min-w-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium ${
                        p.is_here
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {p.is_here ? 'Here' : 'Check in'}
                    </button>
                  )}
                  {/* Claim button */}
                  {!p.claimed_by && !claimedPlayerId && (
                    <button
                      onClick={() => onClaimPlayer(p.id)}
                      className="min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      Claim Spot
                    </button>
                  )}
                  {!isStarted && (
                    <>
                      <button
                        onClick={() => togglePlaying(p.id, p.is_playing)}
                        className={`min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium ${
                          p.is_playing
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {p.is_playing ? 'Playing' : 'Out'}
                      </button>
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-red-400 text-sm"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {/* Remove injured player post-start for host/cohost */}
                  {isStarted && canManage && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${p.name}? (injured/leaving)`)) {
                          togglePlaying(p.id, p.is_playing);
                        }
                      }}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-red-400 text-sm"
                      title="Remove (injured)"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Pairing - Fixed mode only, before start */}
      {!isStarted && game.mode === 'fixed' && activePlayers.length >= 4 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Pair Teams</h3>

          {teams.length > 0 && (
            <div className="space-y-2">
              {teams.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between bg-primary-50 rounded-lg p-2">
                  <span className="text-sm font-medium">
                    Team {i + 1}: {t.player1_name} & {t.player2_name}
                  </span>
                  <button
                    onClick={() => removeTeam(t.id)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {unpairedPlayers.length >= 2 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  className="input-field flex-1"
                  value={teamPlayer1}
                  onChange={(e) => setTeamPlayer1(e.target.value)}
                >
                  <option value="">Player 1...</option>
                  {unpairedPlayers
                    .filter((p) => p.id !== teamPlayer2)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                  className="input-field flex-1"
                  value={teamPlayer2}
                  onChange={(e) => setTeamPlayer2(e.target.value)}
                >
                  <option value="">Player 2...</option>
                  {unpairedPlayers
                    .filter((p) => p.id !== teamPlayer1)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
              <button
                onClick={createTeam}
                disabled={!teamPlayer1 || !teamPlayer2}
                className="btn-secondary"
              >
                Pair Team
              </button>
            </div>
          )}

          {unpairedPlayers.length === 1 && (
            <p className="text-sm text-amber-600">
              1 player remaining unpaired. Need an even number of active players.
            </p>
          )}

          {unpairedPlayers.length === 0 && teams.length > 0 && (
            <p className="text-sm text-primary-600 font-medium">
              All players are paired! Ready to start.
            </p>
          )}
        </div>
      )}

      {/* Start Round Robin button */}
      {!isStarted && activePlayers.length >= 4 && (game.mode === 'rotating' || allPaired) && canManage && (
        <button
          onClick={onStartRoundRobin}
          disabled={generatingSchedule}
          className="btn-primary text-lg"
        >
          {generatingSchedule ? 'Starting...' : 'START ROUND ROBIN'}
        </button>
      )}

      {!isStarted && game.mode === 'fixed' && activePlayers.length >= 4 && !allPaired && (
        <p className="text-center text-sm text-gray-500">
          Pair all players into teams before starting
        </p>
      )}

      {/* Regenerate schedule — use !! to coerce number to boolean so React doesn't render "0" */}
      {isStarted && !!game.schedule_generated && canManage && (
        <button
          onClick={onGenerateSchedule}
          disabled={generatingSchedule}
          className="btn-secondary"
        >
          {generatingSchedule ? 'Regenerating...' : 'Regenerate Schedule'}
        </button>
      )}

      {!isStarted && activePlayers.length > 0 && activePlayers.length < 4 && (
        <p className="text-center text-sm text-gray-500">
          Need at least 4 active players to start
        </p>
      )}
    </div>
  );
}
