'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { Game, Player, RoundWithMatches, Ranking, Division } from '@/lib/types';

import GameHeader from '@/components/game/GameHeader';
import TabNav, { type Tab } from '@/components/game/TabNav';
import PlayersTab from '@/components/game/PlayersTab';
import DivisionsTab from '@/components/game/DivisionsTab';
import ScheduleTab from '@/components/game/ScheduleTab';
import ScoresTab from '@/components/game/ScoresTab';
import RankingsTab from '@/components/game/RankingsTab';
import MyGamesTab from '@/components/game/MyGamesTab';
import { RoundConfirmModal, DeleteConfirmModal, ShareModal, ReopenConfirmModal, EditSettingsModal } from '@/components/game/Modals';

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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = (params.code as string).toUpperCase();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const [tab, setTab] = useState<Tab>('players');
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<RoundWithMatches[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Delete game
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reopen game
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Edit game settings
  const [showEditSettings, setShowEditSettings] = useState(false);
  const [editCourts, setEditCourts] = useState('');
  const [editMaxPlayers, setEditMaxPlayers] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Team pairing
  interface TeamPairing { id: string; player1_id: string; player2_id: string; player1_name: string; player2_name: string; team_name: string | null; }
  const [teams, setTeams] = useState<TeamPairing[]>([]);

  // Non-member redirect: only check once after initial load
  const redirectChecked = useRef(false);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  const fetchData = useCallback(async () => {
    try {
      const [gameRes, playersRes, scheduleRes, rankingsRes, teamsRes, divisionsRes] = await Promise.all([
        fetch(`/api/games/${code}`),
        fetch(`/api/games/${code}/players`),
        fetch(`/api/games/${code}/schedule`),
        fetch(`/api/games/${code}/rankings`),
        fetch(`/api/games/${code}/teams`),
        fetch(`/api/games/${code}/divisions`),
      ]);

      if (!gameRes.ok) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const [gameData, playersData, scheduleData, rankingsData, teamsData, divisionsData] =
        await Promise.all([
          gameRes.json(),
          playersRes.json(),
          scheduleRes.json(),
          rankingsRes.json(),
          teamsRes.json(),
          divisionsRes.json(),
        ]);

      setGame(gameData);
      setPlayers(playersData);
      setRounds(scheduleData);
      setRankings(rankingsData);
      if (Array.isArray(teamsData)) setTeams(teamsData);
      if (Array.isArray(divisionsData)) setDivisions(divisionsData);

      const myPlayer = playersData.find(
        (p: Player) => (user && p.user_id === user.id) || p.claimed_by === deviceId
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Redirect non-members to the join page (handles direct URL sharing)
  useEffect(() => {
    if (loading || !user || redirectChecked.current) return;
    redirectChecked.current = true;
    const inGame = players.some(
      (p) => p.user_id === user.id || (deviceId && p.claimed_by === deviceId)
    );
    if (!inGame) {
      router.replace(`/join/${code}`);
    }
  }, [loading, user, players, deviceId, code, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(window.location.href, {
          width: 256, margin: 2,
          color: { dark: '#5e3485', light: '#ffffff' },
        }).then(setQrDataUrl);
      });
    }
  }, []);

  const claimPlayer = async (playerId: string) => {
    const claimData: Record<string, string> = { claimed_by: user ? user.id : deviceId };
    if (user) {
      claimData.user_id = user.id;
      claimData.name = user.display_name;
    }
    const res = await fetch(`/api/games/${code}/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimData),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to claim spot');
      return;
    }
    setClaimedPlayerId(playerId);
    setSelectedPlayerId(playerId);
    fetchData();
  };

  const deleteGame = async () => {
    try {
      const res = await fetch(`/api/games/${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete game');
    }
    setShowDeleteConfirm(false);
  };

  const startRoundRobin = () => {
    const active = players.filter((p) => p.is_playing);
    const n = active.length;
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
      await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started: 1, num_rounds: selectedRounds }),
      });
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
    if (game?.schedule_generated && !confirm('This will replace the current schedule and all scores. Continue?')) return;
    setGeneratingSchedule(true);
    try {
      const res = await fetch(`/api/games/${code}/schedule`, { method: 'POST' });
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
    if (isNaN(t1) || isNaN(t2) || t1 < 0 || t2 < 0) { alert('Please enter valid scores'); return; }
    if (t1 === t2) { alert('Scores cannot be tied'); return; }
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

  const completeGame = async () => {
    if (!confirm('Mark this game as complete?')) return;
    try {
      await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: 1 }),
      });
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to complete game');
    }
  };

  const reopenGame = async () => {
    setShowReopenConfirm(false);
    setReopening(true);
    try {
      const res = await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopen: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTab('players');
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to reopen game');
    } finally {
      setReopening(false);
    }
  };

  const openEditSettings = () => {
    if (!game) return;
    setEditCourts(String(game.num_courts));
    setEditMaxPlayers(String(game.max_players));
    setEditError('');
    setShowEditSettings(true);
  };

  const saveSettings = async () => {
    if (!game) return;
    const courts = parseInt(editCourts);
    const maxP = parseInt(editMaxPlayers);

    if (isNaN(courts) || courts < 1 || courts > 12) {
      setEditError('Courts must be between 1 and 12');
      return;
    }
    if (isNaN(maxP) || maxP < 4 || maxP > 48) {
      setEditError('Max players must be between 4 and 48');
      return;
    }

    const body: Record<string, number> = {};
    if (courts !== game.num_courts) body.num_courts = courts;
    if (maxP !== game.max_players) body.max_players = maxP;

    if (Object.keys(body).length === 0) {
      setShowEditSettings(false);
      return;
    }

    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/games/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to save settings');
        return;
      }
      if (data.needs_schedule_regen) {
        const schedRes = await fetch(`/api/games/${code}/schedule`, { method: 'POST' });
        const schedData = await schedRes.json();
        if (!schedRes.ok) {
          setEditError(schedData.error || 'Failed to regenerate schedule');
          return;
        }
      }
      setShowEditSettings(false);
      fetchData();
    } catch {
      setEditError('Failed to save settings');
    } finally {
      setEditSaving(false);
    }
  };

  const shareResults = () => {
    const lines = [`${game?.name} - Final Results`];
    rankings.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.player_name} - ${r.wins}W ${r.losses}L (${r.point_differential > 0 ? '+' : ''}${r.point_differential})`);
    });
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ title: `${game?.name} Results`, text });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Results copied to clipboard!');
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
          <a href="/" className="text-primary-700 font-medium text-lg">&larr; Back to Home</a>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter((p) => p.is_playing && (p.waitlist_position === null || p.waitlist_position === undefined));
  const completedMatches = rounds.reduce((sum, r) => sum + r.matches.filter((m) => m.is_completed).length, 0);
  const totalMatches = rounds.reduce((sum, r) => sum + r.matches.length, 0);
  const isStarted = !!game?.started;
  const currentPlayer = players.find((p) => (user && p.user_id === user.id) || p.claimed_by === deviceId) || null;
  const canEditScores = !!currentPlayer && (currentPlayer.waitlist_position === null || currentPlayer.waitlist_position === undefined);
  const isHostOrCohost = currentPlayer?.role === 'host' || currentPlayer?.role === 'cohost';
  const hasScores = completedMatches > 0;
  const canEditSettings = isHostOrCohost && !game?.is_complete;

  const allTabs: Tab[] = ['players'];
  // Divisions tab hidden until ready for production
  // allTabs.push('divisions');
  allTabs.push('schedule', 'scores', 'rankings');
  if (claimedPlayerId || players.length > 0) allTabs.push('my-games');

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {game?.group_code && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <button
            onClick={() => router.push(`/group/${game.group_code}`)}
            className="flex items-center gap-1 text-sm text-primary-700 font-medium"
          >
            &larr; Back to {game.group_name || 'Group'}
          </button>
        </div>
      )}

      <GameHeader
        game={game!}
        code={code}
        activePlayers={activePlayers}
        completedMatches={completedMatches}
        totalMatches={totalMatches}
        onShare={() => setShowShare(true)}
      />

      {/* Management actions — host/cohost only */}
      {isHostOrCohost && !game?.is_complete && (
        <div className="max-w-lg mx-auto px-4 mt-2 space-y-2">
          {isStarted && (
            <>
              <button
                onClick={completeGame}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl active:bg-green-700"
              >
                Complete Game
              </button>
              {completedMatches === 0 ? (
                <button
                  onClick={() => setShowReopenConfirm(true)}
                  disabled={reopening}
                  className="w-full py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl active:bg-amber-600 disabled:opacity-50"
                >
                  {reopening ? 'Reopening...' : 'Reopen for Players'}
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center">
                  Cannot reopen — {completedMatches} game{completedMatches !== 1 ? 's' : ''} already played
                </p>
              )}
            </>
          )}
          <button
            onClick={openEditSettings}
            className="w-full py-2 bg-primary-50 text-primary-700 text-sm font-semibold rounded-xl border border-primary-200 active:bg-primary-100"
          >
            Edit Game Settings
          </button>
          {currentPlayer?.role === 'host' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-red-500 text-sm font-medium rounded-xl border border-red-200 bg-red-50 active:bg-red-100"
            >
              Delete Game
            </button>
          )}
        </div>
      )}

      {!!game?.is_complete && (
        <div className="max-w-lg mx-auto px-4 mt-2 space-y-2">
          {rankings.length > 0 && (
            <button onClick={shareResults} className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl">
              Share Results
            </button>
          )}
          {currentPlayer?.role === 'host' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-red-500 text-sm font-medium rounded-xl border border-red-200 bg-red-50 active:bg-red-100"
            >
              Delete Game
            </button>
          )}
        </div>
      )}

      <TabNav tabs={allTabs} activeTab={tab} onTabChange={setTab} />

      <main className="max-w-lg mx-auto px-4 space-y-4">
        {tab === 'players' && (
          <>
            <PlayersTab
              game={game!}
              code={code}
              players={players}
              activePlayers={activePlayers}
              teams={teams}
              divisions={divisions}
              isStarted={isStarted}
              deviceId={deviceId}
              claimedPlayerId={claimedPlayerId}
              currentPlayer={currentPlayer}
              currentUserId={user?.id || null}
              generatingSchedule={generatingSchedule}
              onFetchData={fetchData}
              onStartRoundRobin={startRoundRobin}
              onGenerateSchedule={generateSchedule}
              onClaimPlayer={claimPlayer}
            />
          </>
        )}

        {tab === 'divisions' && (
          <DivisionsTab
            game={game!}
            code={code}
            divisions={divisions}
            players={players}
            currentPlayer={currentPlayer}
            onFetchData={fetchData}
          />
        )}

        {tab === 'schedule' && (
          <ScheduleTab rounds={rounds} divisions={divisions} />
        )}

        {tab === 'scores' && (
          <ScoresTab
            rounds={rounds}
            divisions={divisions}
            editingMatch={editingMatch}
            scoreT1={scoreT1}
            scoreT2={scoreT2}
            setEditingMatch={setEditingMatch}
            setScoreT1={setScoreT1}
            setScoreT2={setScoreT2}
            submitScore={submitScore}
            canEdit={canEditScores}
          />
        )}

        {tab === 'rankings' && (
          <RankingsTab
            rankings={rankings}
            completedMatches={completedMatches}
            divisions={divisions}
            code={code}
          />
        )}

        {tab === 'my-games' && (
          <MyGamesTab
            players={players}
            rounds={rounds}
            deviceId={deviceId}
            userId={user?.id || null}
            claimedPlayerId={claimedPlayerId}
            selectedPlayerId={selectedPlayerId}
            setSelectedPlayerId={setSelectedPlayerId}
          />
        )}
      </main>

      {/* Modals */}
      {showRoundConfirm && game && (
        <RoundConfirmModal
          activePlayers={activePlayers}
          game={game}
          suggestedRounds={suggestedRounds}
          selectedRounds={selectedRounds}
          setSelectedRounds={setSelectedRounds}
          onConfirm={confirmAndStart}
          onClose={() => setShowRoundConfirm(false)}
        />
      )}

      {showDeleteConfirm && game && (
        <DeleteConfirmModal
          gameName={game.name}
          onDelete={deleteGame}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {showReopenConfirm && (
        <ReopenConfirmModal
          onReopen={reopenGame}
          onClose={() => setShowReopenConfirm(false)}
        />
      )}

      {showShare && (
        <ShareModal
          code={code}
          qrDataUrl={qrDataUrl}
          onShareLink={shareLink}
          onClose={() => setShowShare(false)}
        />
      )}

      {showEditSettings && game && (
        <EditSettingsModal
          game={game}
          courts={editCourts}
          maxPlayers={editMaxPlayers}
          saving={editSaving}
          error={editError}
          hasScores={hasScores}
          onCourtsChange={setEditCourts}
          onMaxPlayersChange={setEditMaxPlayers}
          onSave={saveSettings}
          onClose={() => !editSaving && setShowEditSettings(false)}
        />
      )}
    </div>
  );
}
