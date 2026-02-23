'use client';

import { useState } from 'react';
import type { Game, Player, Division } from '@/lib/types';
import { isHostOrCohost, isHost } from '@/lib/permissions';

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
  currentUserId: string | null;
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
  currentUserId,
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
  const [showHostTransfer, setShowHostTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [editingMaxPlayers, setEditingMaxPlayers] = useState(false);
  const [newMaxPlayers, setNewMaxPlayers] = useState(String(game.max_players || 48));

  const pairedPlayerIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));
  const unpairedPlayers = activePlayers.filter((p) => !pairedPlayerIds.has(p.id));
  const allPaired = game.mode === 'fixed' && activePlayers.length >= 4 && activePlayers.length % 2 === 0 && unpairedPlayers.length === 0;

  // Permission checks — default to false if no currentPlayer
  const canManage = currentPlayer ? isHostOrCohost(currentPlayer) : false;
  const isCurrentHost = currentPlayer ? isHost(currentPlayer) : false;

  // Split players into active roster and waitlist
  const rosterPlayers = players.filter((p) => p.waitlist_position === null || p.waitlist_position === undefined);
  const waitlistPlayers = players
    .filter((p) => p.waitlist_position !== null && p.waitlist_position !== undefined)
    .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0));

  const maxPlayers = game.max_players || 48;
  const activeCount = activePlayers.length;
  const isFull = activeCount >= maxPlayers;

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

  const changeRole = async (playerId: string, role: string) => {
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to change role');
    }
  };

  const approveWaitlistPlayer = async (playerId: string) => {
    try {
      const res = await fetch(`/api/games/${code}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to approve player');
    }
  };

  const approveAllWaitlist = async () => {
    if (!confirm(`Approve all ${waitlistPlayers.length} waitlisted players?`)) return;
    try {
      const res = await fetch(`/api/games/${code}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to approve waitlist');
    }
  };

  const updateMaxPlayers = async () => {
    const parsed = parseInt(newMaxPlayers) || 12;
    const clamped = Math.max(4, Math.min(48, parsed));
    try {
      const res = await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_players: clamped }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingMaxPlayers(false);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update max players');
    }
  };

  const transferHost = async () => {
    if (!transferTarget) return;
    if (!confirm('Transfer host role? You will become a regular player.')) return;
    try {
      await changeRole(transferTarget, 'host');
      setShowHostTransfer(false);
      setTransferTarget('');
    } catch {
      // changeRole already alerts
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

  // Determine if current user can remove a specific player
  const canRemovePlayer = (p: Player) => {
    // Host can remove anyone except themselves (must transfer first)
    if (isCurrentHost) return p.role !== 'host';
    // Co-host can remove regular players only
    if (canManage) return p.role === 'player';
    // Regular players can only remove themselves (before start)
    return p.user_id === currentUserId;
  };

  const renderPlayerRow = (p: Player, idx: number, isWaitlist: boolean) => {
    const isSelf = p.user_id === currentUserId || (!p.user_id && p.claimed_by === deviceId);

    return (
      <div
        key={p.id}
        className={`rounded-lg p-3 ${
          isWaitlist
            ? 'bg-amber-50 border border-amber-100'
            : p.is_playing ? 'bg-primary-50' : 'bg-gray-50 opacity-60'
        }`}
      >
        {/* Row 1: Number + Name + Badges */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-400 w-5 shrink-0 text-center">
            {isWaitlist ? `#${p.waitlist_position}` : idx + 1}
          </span>
          <span className={`font-medium text-base ${
            isWaitlist ? 'text-amber-800' : p.is_playing ? 'text-gray-900' : 'text-gray-400 line-through'
          }`}>
            {p.name}
          </span>
          {isSelf && (
            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">You</span>
          )}
          {p.user_id && p.user_id !== currentUserId && !isWaitlist && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none shrink-0">Claimed</span>
          )}
          {isWaitlist && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">Waitlist</span>
          )}
          {getRoleBadge(p.role)}
        </div>

        {/* Row 2: Status badges + Action buttons */}
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
            {/* Check-in toggle (not for waitlisted players) */}
            {!isWaitlist && (isSelf || canManage) && (
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
            {!isWaitlist && !p.user_id && !claimedPlayerId && (
              <button
                onClick={() => onClaimPlayer(p.id)}
                className="min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700"
              >
                Claim Spot
              </button>
            )}
            {/* Approve from waitlist (host/cohost only) */}
            {isWaitlist && canManage && (
              <button
                onClick={() => approveWaitlistPlayer(p.id)}
                className="min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium bg-green-100 text-green-700"
              >
                Approve
              </button>
            )}
            {/* Playing toggle + Remove (before start, host/cohost only) */}
            {!isStarted && !isWaitlist && canManage && (
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
                {canRemovePlayer(p) && (
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-red-400 text-sm"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
            {/* Remove from waitlist (host/cohost only) */}
            {!isStarted && isWaitlist && canManage && canRemovePlayer(p) && (
              <button
                onClick={() => removePlayer(p.id)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-red-400 text-sm"
              >
                ✕
              </button>
            )}
            {/* Remove injured player post-start for host/cohost */}
            {isStarted && !isWaitlist && canManage && p.is_playing === 1 && p.role !== 'host' && (
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
            {/* Co-host assignment (host only, for regular players) */}
            {isCurrentHost && p.role === 'player' && p.user_id && !isWaitlist && (
              <button
                onClick={() => changeRole(p.id, 'cohost')}
                className="min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600"
                title="Make Co-host"
              >
                +Co-host
              </button>
            )}
            {/* Remove co-host (host only) */}
            {isCurrentHost && p.role === 'cohost' && (
              <button
                onClick={() => {
                  if (confirm(`Remove co-host role from ${p.name}?`)) {
                    changeRole(p.id, 'player');
                  }
                }}
                className="min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"
                title="Remove Co-host"
              >
                -Co-host
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Add player form - only show for host/cohost if not started */}
      {!isStarted && canManage && (
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
            {isFull ? 'Game is full — new players will be added to the waitlist' : `${activeCount}/${maxPlayers} spots filled`}
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

      {/* Capacity indicator + Max players adjustment */}
      {players.length > 0 && (
        <div className={`card py-3 ${isFull ? 'bg-amber-50 border border-amber-200' : ''}`}>
          <p className={`text-sm font-semibold text-center ${isFull ? 'text-amber-700' : 'text-gray-700'}`}>
            {activeCount}/{maxPlayers} spots filled
            {isFull && ' — FULL'}
            {waitlistPlayers.length > 0 && (
              <span className="text-amber-600"> — {waitlistPlayers.length} on waitlist</span>
            )}
          </p>
          {canManage && !editingMaxPlayers && (
            <button
              onClick={() => { setNewMaxPlayers(String(maxPlayers)); setEditingMaxPlayers(true); }}
              className="mt-2 w-full text-xs text-primary-600 font-medium"
            >
              Change max players ({maxPlayers})
            </button>
          )}
          {canManage && editingMaxPlayers && (
            <div className="mt-2 flex items-center gap-2 justify-center">
              <label className="text-xs text-gray-600">Max (4–48):</label>
              <input
                type="number"
                inputMode="numeric"
                min={4}
                max={48}
                value={newMaxPlayers}
                onChange={(e) => setNewMaxPlayers(e.target.value)}
                onBlur={() => {
                  const n = parseInt(newMaxPlayers);
                  if (isNaN(n) || n < 4) setNewMaxPlayers('4');
                  else if (n > 48) setNewMaxPlayers('48');
                  else setNewMaxPlayers(String(n));
                }}
                className="w-16 text-center border rounded px-2 py-1 text-sm"
                placeholder="12"
              />
              <button
                onClick={updateMaxPlayers}
                className="py-1 px-3 bg-primary-600 text-white text-xs rounded-lg font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setEditingMaxPlayers(false)}
                className="py-1 px-3 bg-gray-200 text-gray-600 text-xs rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Host management section */}
      {isCurrentHost && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-gray-700">Host Controls</h3>
          <button
            onClick={() => setShowHostTransfer(true)}
            className="w-full py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-xl"
          >
            Transfer Host Role
          </button>
        </div>
      )}

      {/* Active player list */}
      {rosterPlayers.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-gray-700 mb-2">
            Active Players ({activeCount})
          </h3>
          {rosterPlayers.map((p, i) => renderPlayerRow(p, i, false))}
        </div>
      )}

      {/* Waitlist */}
      {waitlistPlayers.length > 0 && (
        <div className="card space-y-2 border border-amber-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-700">
              Waitlist ({waitlistPlayers.length})
            </h3>
            {canManage && waitlistPlayers.length > 1 && (
              <button
                onClick={approveAllWaitlist}
                className="py-1.5 px-3 bg-green-600 text-white text-xs font-medium rounded-lg"
              >
                Approve All
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 -mt-1 mb-1">
            {canManage
              ? 'Approve players to add them to the active roster'
              : 'Players will be automatically promoted when spots open up'}
          </p>
          {waitlistPlayers.map((p, i) => renderPlayerRow(p, i, true))}
        </div>
      )}

      {/* Team Pairing - Fixed mode only, before start, host/cohost only */}
      {!isStarted && game.mode === 'fixed' && activePlayers.length >= 4 && canManage && (
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

      {/* Start Round Robin button - host/cohost only */}
      {!isStarted && activePlayers.length >= 4 && (game.mode === 'rotating' || allPaired) && canManage && (
        <button
          onClick={onStartRoundRobin}
          disabled={generatingSchedule}
          className="btn-primary text-lg"
        >
          {generatingSchedule ? 'Starting...' : 'START ROUND ROBIN'}
        </button>
      )}

      {!isStarted && game.mode === 'fixed' && activePlayers.length >= 4 && !allPaired && canManage && (
        <p className="text-center text-sm text-gray-500">
          Pair all players into teams before starting
        </p>
      )}

      {/* Regenerate schedule — host/cohost only */}
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

      {/* Host Transfer Modal */}
      {showHostTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Transfer Host Role</h3>
            <p className="text-sm text-gray-600">
              Select a player to become the new host. You will become a regular player.
            </p>
            <select
              className="input-field w-full"
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
            >
              <option value="">Select new host...</option>
              {players
                .filter((p) => p.user_id && p.id !== currentPlayer?.id && p.is_playing)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.role === 'cohost' ? '(Co-host)' : ''}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={transferHost}
                disabled={!transferTarget}
                className="flex-1 py-2.5 bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Transfer
              </button>
              <button
                onClick={() => { setShowHostTransfer(false); setTransferTarget(''); }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
