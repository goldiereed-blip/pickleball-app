'use client';

import { useState } from 'react';
import type { Game, Division, Player } from '@/lib/types';
import { isHostOrCohost } from '@/lib/permissions';

const DIVISION_COLORS = ['#854AAF', '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED'];

interface DivisionsTabProps {
  game: Game;
  code: string;
  divisions: Division[];
  players: Player[];
  currentPlayer: Player | null;
  onFetchData: () => void;
}

export default function DivisionsTab({
  game,
  code,
  divisions,
  players,
  currentPlayer,
  onFetchData,
}: DivisionsTabProps) {
  const [name, setName] = useState('');
  const [courtStart, setCourtStart] = useState(1);
  const [courtEnd, setCourtEnd] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCourtStart, setEditCourtStart] = useState(1);
  const [editCourtEnd, setEditCourtEnd] = useState(1);

  const canManage = currentPlayer ? isHostOrCohost(currentPlayer) : true;
  const totalCourts = game.num_courts;
  const assignedCourts = divisions.reduce((sum, d) => sum + (d.court_end - d.court_start + 1), 0);

  const createDivision = async () => {
    if (!name.trim()) return;
    try {
      const colorIndex = divisions.length % DIVISION_COLORS.length;
      const res = await fetch(`/api/games/${code}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          court_start: courtStart,
          court_end: courtEnd,
          color: DIVISION_COLORS[colorIndex],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName('');
      setCourtStart(courtEnd + 1 <= totalCourts ? courtEnd + 1 : 1);
      setCourtEnd(courtEnd + 1 <= totalCourts ? courtEnd + 1 : 1);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create division');
    }
  };

  const updateDivision = async (id: string) => {
    try {
      const res = await fetch(`/api/games/${code}/divisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          court_start: editCourtStart,
          court_end: editCourtEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update division');
    }
  };

  const deleteDivision = async (id: string) => {
    if (!confirm('Delete this division?')) return;
    try {
      const res = await fetch(`/api/games/${code}/divisions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete division');
    }
  };

  const startEdit = (d: Division) => {
    setEditingId(d.id);
    setEditName(d.name);
    setEditCourtStart(d.court_start);
    setEditCourtEnd(d.court_end);
  };

  // Player assignment
  const assignPlayersToDivision = async (divisionId: string, playerIds: string[]) => {
    try {
      const res = await fetch(`/api/games/${code}/players/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: playerIds.map((pid) => ({ player_id: pid, division_id: divisionId })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to assign players');
    }
  };

  const balancedSplit = async () => {
    if (divisions.length === 0) {
      alert('Create divisions first');
      return;
    }
    const activePlayers = players.filter((p) => p.is_playing);
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const assignments: { player_id: string; division_id: string }[] = [];
    shuffled.forEach((p, i) => {
      const divIndex = i % divisions.length;
      assignments.push({ player_id: p.id, division_id: divisions[divIndex].id });
    });
    try {
      const res = await fetch(`/api/games/${code}/players/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onFetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to split players');
    }
  };

  const unassignedPlayers = players.filter((p) => p.is_playing && !p.division_id);
  const getPlayersForDivision = (divId: string) => players.filter((p) => p.division_id === divId);

  // Court allocation bar
  const courtSlots = Array.from({ length: totalCourts }, (_, i) => {
    const courtNum = i + 1;
    const div = divisions.find((d) => courtNum >= d.court_start && courtNum <= d.court_end);
    return { courtNum, division: div || null };
  });

  return (
    <div className="space-y-4">
      {/* Court allocation bar */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-2">
          Court Allocation ({assignedCourts} of {totalCourts} assigned)
        </h3>
        <div className="flex gap-1">
          {courtSlots.map(({ courtNum, division }) => (
            <div
              key={courtNum}
              className="flex-1 h-8 rounded flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: division ? division.color : '#E5E7EB',
                color: division ? 'white' : '#9CA3AF',
              }}
            >
              {courtNum}
            </div>
          ))}
        </div>
      </div>

      {/* Division list */}
      {divisions.map((d) => {
        const divPlayers = getPlayersForDivision(d.id);
        const isEditing = editingId === d.id;

        return (
          <div key={d.id} className="card">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Start Court</label>
                    <input
                      type="number"
                      className="input-field"
                      value={editCourtStart}
                      onChange={(e) => setEditCourtStart(parseInt(e.target.value) || 1)}
                      min={1}
                      max={totalCourts}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">End Court</label>
                    <input
                      type="number"
                      className="input-field"
                      value={editCourtEnd}
                      onChange={(e) => setEditCourtEnd(parseInt(e.target.value) || 1)}
                      min={editCourtStart}
                      max={totalCourts}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateDivision(d.id)} className="btn-primary flex-1">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-xs text-gray-500">
                    Courts {d.court_start}-{d.court_end} ({divPlayers.length} players)
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(d)} className="text-xs text-primary-600 px-2">Edit</button>
                    <button onClick={() => deleteDivision(d.id)} className="text-xs text-red-500 px-2">Delete</button>
                  </div>
                )}
              </div>
            )}

            {/* Players in this division */}
            {divPlayers.length > 0 && !isEditing && (
              <div className="mt-2 flex flex-wrap gap-1">
                {divPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Create division form */}
      {canManage && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Add Division</h3>
          <input
            type="text"
            className="input-field"
            placeholder="Division name (e.g., Division A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Start Court</label>
              <input
                type="number"
                className="input-field"
                value={courtStart}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  setCourtStart(v);
                  if (courtEnd < v) setCourtEnd(v);
                }}
                min={1}
                max={totalCourts}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">End Court</label>
              <input
                type="number"
                className="input-field"
                value={courtEnd}
                onChange={(e) => setCourtEnd(parseInt(e.target.value) || courtStart)}
                min={courtStart}
                max={totalCourts}
              />
            </div>
          </div>
          <button
            onClick={createDivision}
            disabled={!name.trim()}
            className="btn-primary"
          >
            Create Division
          </button>
        </div>
      )}

      {/* Player assignment */}
      {canManage && divisions.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">Player Assignment</h3>
          <button onClick={balancedSplit} className="btn-secondary">
            Balanced Split (Random)
          </button>

          {unassignedPlayers.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">
                {unassignedPlayers.length} unassigned player{unassignedPlayers.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {unassignedPlayers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <span className="text-sm">{p.name}</span>
                    <div className="flex gap-1">
                      {divisions.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => assignPlayersToDivision(d.id, [p.id])}
                          className="text-xs px-2 py-1 rounded text-white"
                          style={{ backgroundColor: d.color }}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
