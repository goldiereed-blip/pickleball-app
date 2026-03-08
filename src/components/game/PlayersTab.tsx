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

  const pairedPlayerIds = new Set(teams.flatMap((t) => [t.player1_id, t.player2_id]));
  const unpairedPlayers = activePlayers.filter((p) => !pairedPlayerIds.has(p.id));
  const allPaired = game.mode === 'fixed' && activePlayers.length >= 4 && activePlayers.length % 2 === 0 && unpairedPlayers.length === 0;

  const canManage = currentPlayer ? isHostOrCohost(currentPlayer) : false;
  const isCurrentHost = currentPlayer ? isHost(currentPlayer) : false;

  const rosterPlayers = players.filter((p) => p.waitlist_position === null || p.waitlist_position === undefined);
  const waitlistPlayers = players
    .filter((p) => p.waitlist_position !== null && p.waitlist_position !== undefined)
    .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0));

  const maxPlayers = game.max_players || 48;
  const activeCount = activePlayers.length;
  const isFull = activeCount >= maxPlayers;

  const canStart = !isStarted && activeCount >= 4 && (game.mode === 'rotating' || allPaired) && canManage;
  const needsFixedPairing = !isStarted && game.mode === 'fixed' && activeCount >= 4 && !allPaired && canManage;

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
    if (role === 'host') return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">Host</span>;
    if (role === 'cohost') return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">Co-host</span>;
    return null;
  };

  const getDivisionBadge = (divisionId: string | null) => {
    if (!divisionId) return null;
    const div = divisions.find((d) => d.id === divisionId);
    if (!div) return null;
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full text-white leading-none shrink-0" style={{ backgroundColor: div.color }}>
        {div.name}
      </span>
    );
  };

  const canRemovePlayer = (p: Player) => {
    if (isCurrentHost) return p.role !== 'host';
    if (canManage) return p.role === 'player';
    return p.user_id === currentUserId;
  };

  const renderPlayerRow = (p: Player, idx: number, isWaitlist: boolean) => {
    const isSelf = p.user_id === currentUserId || (!p.user_id && p.claimed_by === deviceId);

    return (
      <div
        key={p.id}
        className={`flex items-center gap-2.5 py-2.5 ${
          idx < (isWaitlist ? waitlistPlayers : rosterPlayers).length - 1
            ? 'border-b border-gray-100'
            : ''
        }`}
      >
        {/* Position number */}
        <span className="text-sm text-gray-400 w-5 shrink-0 text-center font-medium">
          {isWaitlist ? `#${p.waitlist_position}` : idx + 1}
        </span>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-medium text-sm ${
              !p.is_playing && !isWaitlist ? 'line-through text-gray-400' : 'text-gray-900'
            }`}>
              {p.name}
            </span>
            {isSelf && (
              <span className="text-xs text-primary-600 font-semibold shrink-0">(You)</span>
            )}
            {getRoleBadge(p.role)}
            {getDivisionBadge(p.division_id)}
            {p.user_id && p.user_id !== currentUserId && !isSelf && (
              <span className="text-xs text-gray-400 shrink-0">claimed</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Claim button */}
          {!isWaitlist && !p.user_id && !claimedPlayerId && (
            <button
              onClick={() => onClaimPlayer(p.id)}
              className="min-h-[40px] py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 active:bg-blue-200"
            >
              Claim
            </button>
          )}
          {/* Approve from waitlist */}
          {isWaitlist && canManage && (
            <button
              onClick={() => approveWaitlistPlayer(p.id)}
              className="min-h-[40px] py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 active:bg-green-200"
            >
              Approve
            </button>
          )}
          {/* Pre-start: playing toggle */}
          {!isStarted && !isWaitlist && canManage && (
            <button
              onClick={() => togglePlaying(p.id, p.is_playing)}
              className={`min-h-[40px] py-1.5 px-2.5 rounded-lg text-xs font-semibold ${
                p.is_playing ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {p.is_playing ? 'In' : 'Out'}
            </button>
          )}
          {/* Remove player */}
          {!isStarted && canRemovePlayer(p) && (
            <button
              onClick={() => removePlayer(p.id)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 active:text-red-600"
            >
              ✕
            </button>
          )}
          {/* Remove injured post-start */}
          {isStarted && !isWaitlist && canManage && p.is_playing === 1 && p.role !== 'host' && (
            <button
              onClick={() => {
                if (confirm(`Remove ${p.name}? (injured/leaving)`)) {
                  togglePlaying(p.id, p.is_playing);
                }
              }}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 active:text-red-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  };

  // Co-hosts list (for Host Controls section)
  const cohosts = players.filter((p) => p.role === 'cohost' && p.is_playing);
  const promotablePlayers = players.filter((p) => p.role === 'player' && p.user_id && p.is_playing);

  return (
    <div className="space-y-4">
      {/* ── START ROUND ROBIN ── prominent at top, sticky */}
      {canStart && (
        <div className="sticky top-[52px] z-10 bg-gray-50 pt-1 pb-1">
          <button
            onClick={onStartRoundRobin}
            disabled={generatingSchedule}
            className="w-full min-h-[56px] py-3 bg-primary-700 text-white text-lg font-bold rounded-2xl
                       shadow-md active:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            {generatingSchedule ? 'Starting...' : '▶  Start Round Robin'}
          </button>
        </div>
      )}

      {needsFixedPairing && (
        <div className="card bg-amber-50 border border-amber-200 text-center py-3">
          <p className="text-sm text-amber-700 font-medium">Pair all players into teams before starting</p>
        </div>
      )}

      {/* Add player form */}
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
              className="min-h-[48px] py-2 px-5 bg-primary-600 text-white font-semibold rounded-xl
                         active:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {isFull
              ? `Full (${activeCount}/${maxPlayers}) — new players join waitlist`
              : `${activeCount}/${maxPlayers} spots filled`}
          </p>
        </div>
      )}

      {isStarted && (
        <div className="card text-center py-3">
          <p className="text-sm text-primary-700 font-medium">
            Tournament in progress — player list locked
          </p>
        </div>
      )}

      {/* Active players list */}
      {rosterPlayers.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-1">
            Players <span className="text-gray-400 font-normal text-sm">({activeCount}/{maxPlayers})</span>
          </h3>
          {rosterPlayers.map((p, i) => renderPlayerRow(p, i, false))}
        </div>
      )}

      {/* Waitlist */}
      {waitlistPlayers.length > 0 && (
        <div className="card border border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-amber-700">
              Waitlist ({waitlistPlayers.length})
            </h3>
            {canManage && waitlistPlayers.length > 1 && (
              <button
                onClick={approveAllWaitlist}
                className="py-1.5 px-3 bg-green-600 text-white text-xs font-semibold rounded-lg"
              >
                Approve All
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
            {canManage
              ? 'Approve players to add them to the roster'
              : 'Players promoted automatically when spots open'}
          </p>
          {waitlistPlayers.map((p, i) => renderPlayerRow(p, i, true))}
        </div>
      )}

      {/* Team Pairing — Fixed mode only */}
      {!isStarted && game.mode === 'fixed' && activePlayers.length >= 4 && canManage && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Pair Teams</h3>
          {teams.length > 0 && (
            <div className="space-y-2">
              {teams.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between bg-primary-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium">
                    Team {i + 1}: {t.player1_name} & {t.player2_name}
                  </span>
                  <button onClick={() => removeTeam(t.id)} className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-400 text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {unpairedPlayers.length >= 2 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select className="input-field flex-1" value={teamPlayer1} onChange={(e) => setTeamPlayer1(e.target.value)}>
                  <option value="">Player 1...</option>
                  {unpairedPlayers.filter((p) => p.id !== teamPlayer2).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select className="input-field flex-1" value={teamPlayer2} onChange={(e) => setTeamPlayer2(e.target.value)}>
                  <option value="">Player 2...</option>
                  {unpairedPlayers.filter((p) => p.id !== teamPlayer1).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={createTeam} disabled={!teamPlayer1 || !teamPlayer2} className="btn-secondary">
                Pair Team
              </button>
            </div>
          )}
          {unpairedPlayers.length === 1 && (
            <p className="text-sm text-amber-600">1 player unpaired — need an even number.</p>
          )}
          {unpairedPlayers.length === 0 && teams.length > 0 && (
            <p className="text-sm text-primary-600 font-medium">All players paired! Ready to start.</p>
          )}
        </div>
      )}

      {!isStarted && activeCount > 0 && activeCount < 4 && (
        <p className="text-center text-sm text-gray-500 py-2">
          Need at least 4 active players to start
        </p>
      )}

      {/* Regenerate schedule */}
      {isStarted && !!game.schedule_generated && canManage && (
        <button
          onClick={onGenerateSchedule}
          disabled={generatingSchedule}
          className="btn-secondary"
        >
          {generatingSchedule ? 'Regenerating...' : 'Regenerate Schedule'}
        </button>
      )}

      {/* Host Controls (at bottom) */}
      {isCurrentHost && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Host Controls</h3>

          {/* Current co-hosts */}
          {cohosts.length > 0 && (
            <div className="space-y-1.5">
              {cohosts.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-blue-800">{p.name}</span>
                    <span className="text-xs text-blue-600 ml-1.5">Co-host</span>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Remove co-host role from ${p.name}?`)) changeRole(p.id, 'player'); }}
                    className="text-xs text-red-500 font-medium py-1 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add co-host */}
          {promotablePlayers.length > 0 && (
            <select
              className="input-field text-sm"
              value=""
              onChange={(e) => {
                if (e.target.value) changeRole(e.target.value, 'cohost');
              }}
            >
              <option value="">+ Add Co-host...</option>
              {promotablePlayers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowHostTransfer(true)}
            className="w-full py-2.5 bg-amber-100 text-amber-700 text-sm font-semibold rounded-xl active:bg-amber-200"
          >
            Transfer Host Role
          </button>
        </div>
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
                className="flex-1 min-h-[48px] py-2.5 bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Transfer
              </button>
              <button
                onClick={() => { setShowHostTransfer(false); setTransferTarget(''); }}
                className="flex-1 min-h-[48px] py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl"
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
