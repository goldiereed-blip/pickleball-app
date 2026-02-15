'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type {
  Game,
  Player,
  RoundWithMatches,
  MatchWithNames,
  Ranking,
} from '@/lib/types';

type Tab = 'players' | 'schedule' | 'scores' | 'rankings' | 'my-games';

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('pb_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pb_device_id', id);
  }
  return id;
}

export default function GamePage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [tab, setTab] = useState<Tab>('players');
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Player form
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Schedule
  const [generatingSchedule, setGeneratingSchedule] = useState(false);

  // Round confirmation
  const [showRoundConfirm, setShowRoundConfirm] = useState(false);
  const [suggestedRounds, setSuggestedRounds] = useState(0);
  const [selectedRounds, setSelectedRounds] = useState(0);

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Score editing
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scoreT1, setScoreT1] = useState('');
  const [scoreT2, setScoreT2] = useState('');

  // Player claiming
  const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null);

  // My games view
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  const fetchData = useCallback(async () => {
    try {
      const [gameRes, playersRes, scheduleRes, rankingsRes] = await Promise.all(
        [
          fetch(`/api/games/${code}`),
          fetch(`/api/games/${code}/players`),
          fetch(`/api/games/${code}/schedule`),
          fetch(`/api/games/${code}/rankings`),
        ]
      );

      if (!gameRes.ok) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const [gameData, playersData, scheduleData, rankingsData] =
        await Promise.all([
          gameRes.json(),
          playersRes.json(),
          scheduleRes.json(),
          rankingsRes.json(),
        ]);

      setGame(gameData);
      setPlayers(playersData);
      setRounds(scheduleData);
      setRankings(rankingsData);

      // Check if this device has a claimed player
      const myPlayer = playersData.find(
        (p: Player) => p.claimed_by === deviceId
      );
      if (myPlayer) {
        setClaimedPlayerId(myPlayer.id);
        setSelectedPlayerId(myPlayer.id);
      }

      setLoading(false);
    } catch {
      setError('Failed to load game data');
      setLoading(false);
    }
  }, [code, deviceId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Generate QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(window.location.href, {
          width: 256,
          margin: 2,
          color: { dark: '#5e3485', light: '#ffffff' },
        }).then(setQrDataUrl);
      });
    }
  }, []);

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
      fetchData();
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
      fetchData();
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
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove player');
    }
  };

  const claimPlayer = async (playerId: string) => {
    await fetch(`/api/games/${code}/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimed_by: deviceId }),
    });
    setClaimedPlayerId(playerId);
    setSelectedPlayerId(playerId);
    fetchData();
  };

  const startRoundRobin = async () => {
    // Calculate suggested rounds
    const activePlayers = players.filter((p) => p.is_playing);
    const n = activePlayers.length;
    const maxCourts = Math.min(game?.num_courts || 1, Math.floor(n / 4));

    let suggested: number;
    if (game?.mode === 'fixed') {
      const numTeams = Math.floor(n / 2);
      const totalMatchups = (numTeams * (numTeams - 1)) / 2;
      suggested = Math.ceil(totalMatchups / maxCourts);
    } else {
      const totalPairs = (n * (n - 1)) / 2;
      const partnershipsPerRound = maxCourts * 2;
      const minRounds = Math.ceil(totalPairs / partnershipsPerRound);
      suggested = minRounds + Math.ceil(minRounds * 0.3);
    }

    setSuggestedRounds(suggested);
    setSelectedRounds(suggested);
    setShowRoundConfirm(true);
  };

  const confirmAndStart = async () => {
    setShowRoundConfirm(false);
    setGeneratingSchedule(true);
    try {
      // Update game: set started, num_rounds
      await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started: 1, num_rounds: selectedRounds }),
      });

      // Generate schedule
      const res = await fetch(`/api/games/${code}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_rounds: selectedRounds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTab('schedule');
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to start tournament');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const generateSchedule = async () => {
    if (
      game?.schedule_generated &&
      !confirm(
        'This will replace the current schedule and all scores. Continue?'
      )
    ) {
      return;
    }
    setGeneratingSchedule(true);
    try {
      const res = await fetch(`/api/games/${code}/schedule`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTab('schedule');
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to generate schedule');
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const submitScore = async (matchId: string) => {
    const t1 = parseInt(scoreT1);
    const t2 = parseInt(scoreT2);
    if (isNaN(t1) || isNaN(t2) || t1 < 0 || t2 < 0) {
      alert('Please enter valid scores');
      return;
    }
    if (t1 === t2) {
      alert('Scores cannot be tied');
      return;
    }
    await fetch(`/api/games/${code}/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team1_score: t1, team2_score: t2 }),
    });
    setEditingMatch(null);
    setScoreT1('');
    setScoreT2('');
    fetchData();
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: game?.name || 'Pickleball Game',
        text: `Join my pickleball game! Join Code: ${code}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🏓</div>
          <p className="text-gray-500">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg">{error}</p>
          <a href="/" className="text-primary-700 font-medium text-lg">
            &larr; Back to Home
          </a>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter((p) => p.is_playing);
  const completedMatches = rounds.reduce(
    (sum, r) => sum + r.matches.filter((m) => m.is_completed).length,
    0
  );
  const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0);
  const isStarted = !!game?.started;

  // Get matches for a specific player
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

  const allTabs: Tab[] = ['players', 'schedule', 'scores', 'rankings'];
  if (claimedPlayerId || players.length > 0) {
    allTabs.push('my-games');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate">{game?.name}</h1>
              <div className="flex items-center gap-2 text-primary-200 text-sm">
                <span>
                  Join Code: <span className="font-mono font-bold text-white">{code}</span>
                </span>
                <button onClick={copyCode} className="underline text-xs">
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowShare(true)}
              className="ml-2 py-2 px-3 bg-primary-600 rounded-lg text-sm font-medium active:bg-primary-800"
            >
              Share
            </button>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-primary-200">
            <span>{activePlayers.length} players</span>
            <span>{game?.num_courts} court{game?.num_courts !== 1 ? 's' : ''}</span>
            <span>{game?.mode === 'rotating' ? 'Rotating' : 'Fixed'} partners</span>
            {totalMatches > 0 && (
              <span>
                {completedMatches}/{totalMatches} played
              </span>
            )}
          </div>
          {game?.scheduled_at && (
            <div className="mt-1 text-xs text-primary-200">
              📅 {new Date(game.scheduled_at).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-0 z-10 bg-gray-50 px-4 py-2">
        <div className="max-w-lg mx-auto flex gap-1">
          {allTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-button ${tab === t ? 'tab-active' : 'tab-inactive'}`}
            >
              {t === 'my-games' ? 'My Games' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 space-y-4">
        {/* PLAYERS TAB */}
        {tab === 'players' && (
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
                  {players.length}/14 players
                </p>
              </div>
            )}

            {isStarted && (
              <div className="card text-center py-3">
                <p className="text-sm text-primary-700 font-medium">
                  🏓 Tournament in progress — player list is locked
                </p>
              </div>
            )}

            {/* Player list */}
            {players.length > 0 && (
              <div className="card space-y-1">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Players ({activePlayers.length} active)
                </h3>
                {players.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      p.is_playing ? 'bg-primary-50' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-5">{i + 1}</span>
                      <span className={`font-medium ${p.is_playing ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {p.name}
                      </span>
                      {p.claimed_by === deviceId && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">You</span>
                      )}
                      {p.claimed_by && p.claimed_by !== deviceId && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Claimed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Claim button: show if unclaimed and this device hasn't claimed anyone */}
                      {!p.claimed_by && !claimedPlayerId && (
                        <button
                          onClick={() => claimPlayer(p.id)}
                          className="py-1 px-2 rounded-lg text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          This is me
                        </button>
                      )}
                      {!isStarted && (
                        <>
                          <button
                            onClick={() => togglePlaying(p.id, p.is_playing)}
                            className={`py-1 px-3 rounded-lg text-xs font-medium ${
                              p.is_playing
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-300 text-gray-600'
                            }`}
                          >
                            {p.is_playing ? 'Playing' : 'Out'}
                          </button>
                          <button
                            onClick={() => removePlayer(p.id)}
                            className="text-red-400 text-xs px-1"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Start Round Robin button - main CTA before tournament starts */}
            {!isStarted && activePlayers.length >= 4 && (
              <button
                onClick={startRoundRobin}
                disabled={generatingSchedule}
                className="btn-primary text-lg"
              >
                {generatingSchedule ? 'Starting...' : '🏓 START ROUND ROBIN'}
              </button>
            )}

            {/* Regenerate schedule - only after started */}
            {isStarted && game?.schedule_generated && (
              <button
                onClick={generateSchedule}
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
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            {rounds.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">No schedule generated yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add players and start the round robin from the Players tab
                </p>
              </div>
            ) : (
              rounds.map((round) => (
                <div key={round.round_id} className="card">
                  <h3 className="font-bold text-primary-700 mb-3">
                    Round {round.round_number}
                  </h3>
                  <div className="space-y-2">
                    {round.matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                  {round.sitting.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Sitting out: {round.sitting.join(', ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* SCORES TAB */}
        {tab === 'scores' && (
          <div className="space-y-4">
            {rounds.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">No schedule generated yet</p>
              </div>
            ) : (
              rounds.map((round) => (
                <div key={round.round_id} className="card">
                  <h3 className="font-bold text-primary-700 mb-3">
                    Round {round.round_number}
                  </h3>
                  <div className="space-y-3">
                    {round.matches.map((match) => (
                      <ScoreEntry
                        key={match.id}
                        match={match}
                        editingMatch={editingMatch}
                        scoreT1={scoreT1}
                        scoreT2={scoreT2}
                        setEditingMatch={setEditingMatch}
                        setScoreT1={setScoreT1}
                        setScoreT2={setScoreT2}
                        submitScore={submitScore}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RANKINGS TAB */}
        {tab === 'rankings' && (
          <div className="space-y-4">
            {rankings.length === 0 || completedMatches === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">
                  {rankings.length === 0
                    ? 'No players yet'
                    : 'No scores entered yet. Enter scores to see rankings.'}
                </p>
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2">Player</th>
                      <th className="text-center py-2 px-1">W</th>
                      <th className="text-center py-2 px-1">L</th>
                      <th className="text-center py-2 px-1">+/-</th>
                      <th className="text-center py-2 px-1">GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
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
                          {i === 0 && r.wins > 0 && ' 🏆'}
                        </td>
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
            )}
          </div>
        )}

        {/* MY GAMES TAB */}
        {tab === 'my-games' && (
          <div className="space-y-4">
            {/* Player selector */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-2">View Games For</h3>
              <select
                className="input-field"
                value={selectedPlayerId || ''}
                onChange={(e) => setSelectedPlayerId(e.target.value || null)}
              >
                <option value="">Select a player...</option>
                {players.filter(p => p.is_playing).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.claimed_by === deviceId ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlayerId && (() => {
              const { past, upcoming } = getPlayerMatches(selectedPlayerId);
              const playerName = players.find(p => p.id === selectedPlayerId)?.name || 'Player';
              return (
                <>
                  {/* Upcoming games */}
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

                  {/* Past games */}
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
        )}
      </main>

      {/* Round Confirmation Modal */}
      {showRoundConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowRoundConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center">Confirm Rounds</h2>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                Based on {activePlayers.length} players and {game?.num_courts} court{game?.num_courts !== 1 ? 's' : ''},
                we suggest <span className="font-bold text-primary-700">{suggestedRounds}</span> rounds.
              </p>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Number of Rounds
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field text-center text-2xl font-bold w-32 mx-auto"
                value={selectedRounds}
                onChange={(e) => setSelectedRounds(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="50"
              />
            </div>

            <p className="text-xs text-gray-400 text-center">
              This will lock the player list and start the tournament
            </p>

            <div className="space-y-2">
              <button
                onClick={confirmAndStart}
                className="btn-primary"
              >
                🏓 Start with {selectedRounds} Rounds
              </button>
              <button
                onClick={() => setShowRoundConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center">Share Game</h2>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Join Code</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-primary-700">
                {code}
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
            )}

            <p className="text-center text-xs text-gray-500">
              Scan this QR code or enter the join code to join
            </p>

            <div className="space-y-2">
              <button onClick={shareLink} className="btn-primary">
                Share Link
              </button>
              <button
                onClick={() => setShowShare(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithNames }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>Court {match.court_number}</span>
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

function ScoreEntry({
  match,
  editingMatch,
  scoreT1,
  scoreT2,
  setEditingMatch,
  setScoreT1,
  setScoreT2,
  submitScore,
}: {
  match: MatchWithNames;
  editingMatch: string | null;
  scoreT1: string;
  scoreT2: string;
  setEditingMatch: (id: string | null) => void;
  setScoreT1: (s: string) => void;
  setScoreT2: (s: string) => void;
  submitScore: (id: string) => void;
}) {
  const isEditing = editingMatch === match.id;

  const startEditing = () => {
    setEditingMatch(match.id);
    setScoreT1(match.is_completed ? String(match.team1_score) : '');
    setScoreT2(match.is_completed ? String(match.team2_score) : '');
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
        <span>Court {match.court_number}</span>
        {match.is_completed && (
          <span className="text-primary-600 font-medium">Recorded</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
        <div>
          <p className="font-medium text-sm">
            {match.team1_player1_name} & {match.team1_player2_name}
          </p>
        </div>
        <span className="text-gray-300 text-xs">vs</span>
        <div className="text-right">
          <p className="font-medium text-sm">
            {match.team2_player1_name} & {match.team2_player2_name}
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-2 px-3 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="0"
              value={scoreT1}
              onChange={(e) => setScoreT1(e.target.value)}
              min="0"
              max="99"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 py-2 px-3 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
              placeholder="0"
              value={scoreT2}
              onChange={(e) => setScoreT2(e.target.value)}
              min="0"
              max="99"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => submitScore(match.id)}
              className="flex-1 py-2 bg-primary-600 text-white font-semibold rounded-lg active:bg-primary-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditingMatch(null)}
              className="py-2 px-4 bg-gray-200 text-gray-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          {match.is_completed ? (
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                <span
                  className={
                    (match.team1_score ?? 0) > (match.team2_score ?? 0)
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  }
                >
                  {match.team1_score}
                </span>
                <span className="text-gray-300 mx-1">-</span>
                <span
                  className={
                    (match.team2_score ?? 0) > (match.team1_score ?? 0)
                      ? 'text-primary-600'
                      : 'text-gray-400'
                  }
                >
                  {match.team2_score}
                </span>
              </span>
              <button
                onClick={startEditing}
                className="text-xs text-primary-600 font-medium py-1 px-3 border border-primary-200 rounded-lg"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={startEditing}
              className="w-full py-2 bg-primary-100 text-primary-700 font-medium rounded-lg text-sm active:bg-primary-200"
            >
              Enter Score
            </button>
          )}
        </div>
      )}
    </div>
  );
}
