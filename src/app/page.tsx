'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import TutorialTour from '@/components/TutorialTour';

interface MyGame {
  id: string;
  code: string;
  name: string;
  mode: string;
  scheduled_at: string | null;
  is_complete: number;
  started: number;
}

interface MyGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  member_count: number;
  active_events_count: number;
  next_event_at: string | null;
  user_role: 'admin' | 'member';
}

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const [view, setView] = useState<'home' | 'create' | 'join' | 'create-group' | 'join-group'>('home');
  const [runTour, setRunTour] = useState(false);
  const [myGames, setMyGames] = useState<MyGame[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [gameName, setGameName] = useState('');
  const [numCourts, setNumCourts] = useState('2');
  const [mode, setMode] = useState<'rotating' | 'fixed'>('rotating');
  const [maxPlayers, setMaxPlayers] = useState('12');
  const [scheduledAt, setScheduledAt] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMaxMembers, setGroupMaxMembers] = useState('');
  const [groupJoinCode, setGroupJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Tutorial trigger: auto-start for new users or when ?tutorial=1 is in the URL
  useEffect(() => {
    if (!user || view !== 'home') return;
    const forceTutorial =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('tutorial') === '1';
    if (forceTutorial || user.has_seen_tutorial === false) {
      const timer = setTimeout(() => setRunTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user, view]);

  const handleTourFinish = async () => {
    setRunTour(false);
    await fetch('/api/users/tutorial', { method: 'PATCH' });
    await refresh();
  };

  useEffect(() => {
    if (user) {
      fetch(`/api/users/${user.id}/games`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setMyGames(data); })
        .catch(() => {});
      fetch('/api/groups')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setMyGroups(data); })
        .catch(() => {});
    }
  }, [user]);

  const createGame = async () => {
    if (!gameName.trim()) {
      setError('Please enter a game name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameName.trim(),
          num_courts: parseInt(numCourts) || 2,
          mode,
          max_players: parseInt(maxPlayers) || 12,
          scheduled_at: scheduledAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/game/${data.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Please enter a valid join code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/games/${code}`);
      if (!res.ok) throw new Error('Game not found');
      router.push(`/join/${code}`);
    } catch {
      setError('Game not found. Check the join code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const maxNum = parseInt(groupMaxMembers);
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          max_members: !isNaN(maxNum) && maxNum >= 2 ? maxNum : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/group/${data.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const joinGroupByCode = async () => {
    const code = groupJoinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Please enter a valid invite code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/groups/${code}`);
      if (!res.ok) throw new Error('Group not found');
      router.push(`/group/join/${code}`);
    } catch {
      setError('Group not found. Check the invite code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-primary-700 font-medium text-lg"
          >
            &larr; Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Create Game</h1>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Game Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Saturday Morning Pickleball"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional — lets players know when the event is happening
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Courts (1–12)
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                value={numCourts}
                onChange={(e) => setNumCourts(e.target.value)}
                onBlur={() => {
                  const n = parseInt(numCourts);
                  if (isNaN(n) || n < 1) setNumCourts('1');
                  else if (n > 12) setNumCourts('12');
                  else setNumCourts(String(n));
                }}
                min="1"
                max="12"
                placeholder="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Players (4–48)
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                onBlur={() => {
                  const n = parseInt(maxPlayers);
                  if (isNaN(n) || n < 4) setMaxPlayers('4');
                  else if (n > 48) setMaxPlayers('48');
                  else setMaxPlayers(String(n));
                }}
                min="4"
                max="48"
                placeholder="12"
              />
              <p className="mt-1 text-xs text-gray-500">
                Players beyond this limit will be added to the waitlist
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Tournament Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('rotating')}
                  className={`flex-1 py-3 px-3 rounded-xl font-semibold transition-colors text-sm ${
                    mode === 'rotating'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  Rotating Partners
                </button>
                <button
                  onClick={() => setMode('fixed')}
                  className={`flex-1 py-3 px-3 rounded-xl font-semibold transition-colors text-sm ${
                    mode === 'fixed'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  Fixed Partners
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {mode === 'rotating'
                  ? 'Players rotate partners each round'
                  : 'Teams stay together throughout'}
              </p>
            </div>
          </div>

          <button
            onClick={createGame}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-primary-700 font-medium text-lg"
          >
            &larr; Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Join Game</h1>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Enter Join Code
            </label>
            <input
              type="text"
              className="input-field text-center tracking-widest uppercase"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
          </div>

          <button
            onClick={joinGame}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Looking up...' : 'Join Game'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Or scan the QR code shared by the game creator
          </p>
        </div>
      </div>
    );
  }

  if (view === 'create-group') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-primary-700 font-medium text-lg"
          >
            &larr; Back
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Group</h1>
            <p className="text-gray-500 text-sm mt-1">
              Organize your regular players for recurring games. Members will be auto-added to future events you create.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Group Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Tuesday Night Picklers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
              />
              {groupName.trim().length > 0 &&
               myGroups.some((g) => g.name.toLowerCase() === groupName.trim().toLowerCase()) && (
                <p className="mt-1 text-xs text-amber-600">
                  You already have a group called &ldquo;{groupName.trim()}&rdquo;. You can still create this one.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Description
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Optional — describe your group"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Members
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field"
                value={groupMaxMembers}
                onChange={(e) => setGroupMaxMembers(e.target.value)}
                onBlur={() => {
                  const n = parseInt(groupMaxMembers);
                  if (groupMaxMembers && (isNaN(n) || n < 2)) setGroupMaxMembers('2');
                  else if (n > 100) setGroupMaxMembers('100');
                  else if (!isNaN(n)) setGroupMaxMembers(String(n));
                }}
                placeholder="No limit"
                min="2"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for no limit
              </p>
            </div>
          </div>

          <button
            onClick={createGroup}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join-group') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-primary-700 font-medium text-lg"
          >
            &larr; Back
          </button>

          <h1 className="text-3xl font-bold text-gray-900">Join Group</h1>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Enter Invite Code
            </label>
            <input
              type="text"
              className="input-field text-center tracking-widest uppercase"
              placeholder="ABC123"
              value={groupJoinCode}
              onChange={(e) => setGroupJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
          </div>

          <button
            onClick={joinGroupByCode}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Looking up...' : 'Join Group'}
          </button>
        </div>
      </div>
    );
  }

  // Home view
  const activeGames = myGames.filter((g) => !g.is_complete);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Auth header */}
      <div className="w-full max-w-md mb-4 flex justify-end gap-2">
        <button
          id="tutorial-profile"
          onClick={() => router.push('/profile')}
          className="text-sm text-primary-700 font-medium py-1 px-3 border border-primary-200 rounded-lg"
        >
          {user.display_name}
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-primary-700 font-medium py-1 px-3 border border-primary-200 rounded-lg"
        >
          Stats
        </button>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          className="text-sm text-gray-500 font-medium py-1 px-3 border border-gray-200 rounded-lg"
        >
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-3">
          <div className="w-24 h-24 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-14 h-14 text-primary-600" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Paddle */}
              <ellipse cx="26" cy="24" rx="14" ry="18" fill="currentColor" opacity="0.85" />
              <rect x="22" y="40" width="8" height="16" rx="3" fill="currentColor" opacity="0.7" />
              {/* Ball */}
              <circle cx="48" cy="20" r="8" fill="#F59E0B" />
              <path d="M44 16 Q48 20 44 24" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M48 12 Q52 20 48 28" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Pickleball</h1>
          <h2 className="text-xl text-gray-500">Round Robin</h2>
        </div>

        <div className="space-y-3 pt-6">
          <button id="tutorial-create-game" onClick={() => setView('create')} className="btn-primary">
            Create New Game
          </button>
          <button id="tutorial-join-game" onClick={() => setView('join')} className="btn-secondary">
            Join Existing Game
          </button>
        </div>

        {/* Groups section */}
        <div id="tutorial-groups" className="space-y-3 pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setView('create-group')}
              className="flex-1 py-3 px-3 rounded-xl font-semibold text-sm bg-primary-50 text-primary-700 border border-primary-200 active:bg-primary-100"
            >
              Create Group
            </button>
            <button
              onClick={() => setView('join-group')}
              className="flex-1 py-3 px-3 rounded-xl font-semibold text-sm bg-primary-50 text-primary-700 border border-primary-200 active:bg-primary-100"
            >
              Join Group
            </button>
          </div>
        </div>

        {/* My Groups */}
        <div className="pt-4 text-left">
          {myGroups.length > 0 ? (
            <>
              <h3 className="font-semibold text-gray-700 mb-2">My Groups</h3>
              <div className="space-y-2">
                {myGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/group/${g.code}`)}
                    className="w-full text-left card active:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{g.name}</p>
                      <p className="text-xs text-gray-500">
                        {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                        {g.next_event_at
                          ? ` — Next: ${new Date(g.next_event_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                          : g.active_events_count > 0 ? ` — ${g.active_events_count} active` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-primary-700 font-bold">{g.code}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            !authLoading && (
              <p className="text-xs text-gray-400 text-center pt-1">
                Create a group to organize recurring games with the same players
              </p>
            )
          )}
        </div>

        {/* My Active Games */}
        {activeGames.length > 0 && (
          <div className="pt-4 text-left">
            <h3 className="font-semibold text-gray-700 mb-2">My Active Games</h3>
            <div className="space-y-2">
              {activeGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/game/${g.code}`)}
                  className="w-full text-left card active:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{g.name}</p>
                    <p className="text-xs text-gray-500">
                      {g.started ? 'In Progress' : 'Not Started'}
                      {g.scheduled_at && ` — ${new Date(g.scheduled_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-primary-700 font-bold">{g.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 pt-4">
          Organize round robin tournaments with up to 48 players
        </p>
      </div>

      <TutorialTour run={runTour} onFinish={handleTourFinish} />
    </div>
  );
}
