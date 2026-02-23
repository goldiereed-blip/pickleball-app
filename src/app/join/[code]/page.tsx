'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { Game, Player, RoundWithMatches, Ranking, Division } from '@/lib/types';
import ScheduleTab from '@/components/game/ScheduleTab';
import ScoresTab from '@/components/game/ScoresTab';
import RankingsTab from '@/components/game/RankingsTab';

type PreviewTab = 'players' | 'schedule' | 'scores' | 'rankings';

export default function JoinPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = (params.code as string).toUpperCase();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>('players');

  // Dummy state for read-only ScoresTab
  const [editingMatch] = useState<string | null>(null);
  const [scoreT1] = useState('');
  const [scoreT2] = useState('');
  const noop = () => {};
  const noopStr = (_s: string) => {};
  const noopStrNull = (_s: string | null) => {};

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/join/${code}`);
    }
  }, [authLoading, user, router, code]);

  const fetchData = useCallback(async () => {
    try {
      const [gameRes, playersRes, scheduleRes, rankingsRes, divisionsRes] = await Promise.all([
        fetch(`/api/games/${code}`),
        fetch(`/api/games/${code}/players`),
        fetch(`/api/games/${code}/schedule`),
        fetch(`/api/games/${code}/rankings`),
        fetch(`/api/games/${code}/divisions`),
      ]);

      if (!gameRes.ok) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const [gameData, playersData, scheduleData, rankingsData, divisionsData] = await Promise.all([
        gameRes.json(),
        playersRes.json(),
        scheduleRes.json(),
        rankingsRes.json(),
        divisionsRes.json(),
      ]);

      setGame(gameData);
      setPlayers(playersData);
      setRounds(scheduleData);
      setRankings(rankingsData);
      if (Array.isArray(divisionsData)) setDivisions(divisionsData);
      setLoading(false);
    } catch {
      setError('Failed to load game data');
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  // Find current user's player record
  const myPlayer = players.find((p) => p.user_id === user?.id) || null;
  // Find unclaimed player matching user's name (pre-added by host)
  const unclaimedMatch = !myPlayer
    ? players.find(
        (p) => !p.user_id && p.name.toLowerCase() === user?.display_name?.toLowerCase()
      ) || null
    : null;

  const claimSpot = async (playerId: string) => {
    if (!user) return;
    setClaiming(playerId);
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimed_by: user.id,
          user_id: user.id,
          name: user.display_name,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to claim spot');
      } else {
        await fetchData();
      }
    } catch {
      alert('Failed to claim spot');
    } finally {
      setClaiming(null);
    }
  };

  const joinGame = async () => {
    if (!user) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/games/${code}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.display_name }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to join game');
        setJoining(false);
        return;
      }
      // Claim the newly created player
      await fetch(`/api/games/${code}/players/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimed_by: user.id,
          user_id: user.id,
        }),
      });
      await fetchData();
    } catch {
      alert('Failed to join game');
    } finally {
      setJoining(false);
    }
  };

  const leaveGame = async () => {
    if (!myPlayer || !confirm('Leave this game? Your spot will be given to the next person on the waitlist.')) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/games/${code}/players/${myPlayer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to leave game');
      } else {
        await fetchData();
      }
    } catch {
      alert('Failed to leave game');
    } finally {
      setRemoving(false);
    }
  };

  const removeUnclaimedSpot = async (playerId: string) => {
    if (!confirm('Remove this spot? You can join again later.')) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to remove spot');
      } else {
        await fetchData();
      }
    } catch {
      alert('Failed to remove spot');
    } finally {
      setRemoving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg">{error || 'Game not found'}</p>
          <button onClick={() => router.push('/')} className="text-primary-700 font-medium text-lg">
            &larr; Back to Home
          </button>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter((p) => p.is_playing && (p.waitlist_position === null || p.waitlist_position === undefined));
  const waitlistPlayers = players
    .filter((p) => p.waitlist_position !== null && p.waitlist_position !== undefined)
    .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0));
  const rosterPlayers = players.filter((p) => p.waitlist_position === null || p.waitlist_position === undefined);
  const maxPlayers = game.max_players || 48;
  const isFull = activePlayers.length >= maxPlayers;
  const completedMatches = rounds.reduce((sum, r) => sum + r.matches.filter((m) => m.is_completed).length, 0);

  const tabs: { key: PreviewTab; label: string; show: boolean }[] = [
    { key: 'players', label: 'Players', show: true },
    { key: 'schedule', label: 'Schedule', show: rounds.length > 0 },
    { key: 'scores', label: 'Scores', show: rounds.length > 0 },
    { key: 'rankings', label: 'Rankings', show: rankings.length > 0 },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-primary-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/')} className="font-medium text-sm mb-2 text-primary-200">
            &larr; Home
          </button>
          <h1 className="text-xl font-bold">{game.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-primary-100 text-sm">
            <span className="font-mono font-bold">{code}</span>
            <span>{game.num_courts} court{game.num_courts !== 1 ? 's' : ''}</span>
            <span>{game.mode === 'rotating' ? 'Rotating' : 'Fixed'}</span>
          </div>
          {game.scheduled_at && (
            <p className="text-primary-200 text-sm mt-1">
              {new Date(game.scheduled_at).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {/* Capacity indicator */}
        <div className={`card py-3 text-center ${isFull ? 'bg-amber-50 border border-amber-200' : ''}`}>
          <p className={`text-sm font-semibold ${isFull ? 'text-amber-700' : 'text-gray-700'}`}>
            {activePlayers.length}/{maxPlayers} spots filled
            {isFull && ' — FULL'}
            {waitlistPlayers.length > 0 && (
              <span className="text-amber-600"> — {waitlistPlayers.length} on waitlist</span>
            )}
          </p>
        </div>

        {/* Action Banner */}
        {myPlayer ? (
          // Already joined — show status + actions
          <div className={`card border ${
            myPlayer.waitlist_position != null
              ? 'bg-amber-50 border-amber-200'
              : 'bg-primary-50 border-primary-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  myPlayer.waitlist_position != null
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {myPlayer.waitlist_position != null
                    ? `Waitlist #${myPlayer.waitlist_position}`
                    : "You're In"}
                </span>
                <p className="font-semibold mt-1">{myPlayer.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/game/${code}`)}
                  className="py-2 px-4 bg-primary-600 text-white font-semibold rounded-xl text-sm"
                >
                  Go to Game
                </button>
              </div>
            </div>
            {!game.started && (
              <button
                onClick={leaveGame}
                disabled={removing}
                className="mt-3 w-full py-2 text-sm text-red-600 font-medium bg-red-50 rounded-xl"
              >
                {removing ? 'Leaving...' : 'Leave Game'}
              </button>
            )}
          </div>
        ) : unclaimedMatch ? (
          // Name found in list but unclaimed — offer claim or remove
          <div className="card border border-blue-200 bg-blue-50">
            <p className="text-sm text-blue-800 font-medium mb-2">
              A spot for &ldquo;{unclaimedMatch.name}&rdquo; is reserved in this game
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => claimSpot(unclaimedMatch.id)}
                disabled={claiming === unclaimedMatch.id}
                className="flex-1 py-2.5 bg-primary-600 text-white font-semibold rounded-xl text-sm"
              >
                {claiming === unclaimedMatch.id ? 'Claiming...' : 'Claim Spot'}
              </button>
              <button
                onClick={() => removeUnclaimedSpot(unclaimedMatch.id)}
                disabled={removing}
                className="py-2.5 px-4 bg-red-50 text-red-600 font-medium rounded-xl text-sm border border-red-200"
              >
                {removing ? '...' : 'Remove Me'}
              </button>
            </div>
          </div>
        ) : !game.started ? (
          // Not in game, can join or waitlist
          <button
            onClick={joinGame}
            disabled={joining}
            className="btn-primary"
          >
            {joining
              ? 'Joining...'
              : isFull
              ? `Join Waitlist as ${user.display_name}`
              : `Join Game as ${user.display_name}`}
          </button>
        ) : (
          // Game already started, not in it
          <div className="card text-center py-3 bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">
              This game has already started. You can view the progress below.
            </p>
          </div>
        )}

        {/* Tab navigation */}
        {visibleTabs.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === t.key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'players' && (
          <>
            {/* Active Player List */}
            <div className="card space-y-2">
              <h3 className="font-semibold text-gray-700">
                Active Players ({activePlayers.length})
              </h3>
              {rosterPlayers.length === 0 && (
                <p className="text-sm text-gray-400">No players yet</p>
              )}
              {rosterPlayers.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-lg p-3 flex items-center justify-between ${
                    p.user_id === user.id ? 'bg-primary-50' : p.is_playing ? 'bg-gray-50' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!p.is_playing ? 'text-gray-400 line-through' : ''}`}>
                      {p.name}
                    </span>
                    {p.user_id === user.id && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">You</span>
                    )}
                    {p.user_id && p.user_id !== user.id && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Claimed</span>
                    )}
                    {p.role === 'host' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Host</span>
                    )}
                    {p.role === 'cohost' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Co-host</span>
                    )}
                  </div>
                  {/* Claim button for unclaimed spots (only if user has no player yet) */}
                  {!p.user_id && !myPlayer && !unclaimedMatch && (
                    <button
                      onClick={() => claimSpot(p.id)}
                      disabled={claiming === p.id}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      {claiming === p.id ? '...' : 'Claim Spot'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Waitlist */}
            {waitlistPlayers.length > 0 && (
              <div className="card space-y-2 border border-amber-200">
                <h3 className="font-semibold text-amber-700">
                  Waitlist ({waitlistPlayers.length})
                </h3>
                {waitlistPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg p-3 flex items-center justify-between bg-amber-50 border border-amber-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-600 font-medium w-5 shrink-0">#{p.waitlist_position}</span>
                      <span className="font-medium text-amber-800">{p.name}</span>
                      {p.user_id === user.id && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab rounds={rounds} divisions={divisions} />
        )}

        {activeTab === 'scores' && (
          <ScoresTab
            rounds={rounds}
            divisions={divisions}
            editingMatch={editingMatch}
            scoreT1={scoreT1}
            scoreT2={scoreT2}
            setEditingMatch={noopStrNull}
            setScoreT1={noopStr}
            setScoreT2={noopStr}
            submitScore={noop}
            canEdit={false}
          />
        )}

        {activeTab === 'rankings' && (
          <RankingsTab
            rankings={rankings}
            completedMatches={completedMatches}
            divisions={divisions}
            code={code}
          />
        )}

        {/* Bottom Go to Game button for joined users */}
        {myPlayer && (
          <button
            onClick={() => router.push(`/game/${code}`)}
            className="btn-primary"
          >
            Go to Game
          </button>
        )}
      </div>
    </div>
  );
}
