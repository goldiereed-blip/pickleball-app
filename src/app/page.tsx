'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [gameName, setGameName] = useState('');
  const [numCourts, setNumCourts] = useState(2);
  const [mode, setMode] = useState<'rotating' | 'fixed'>('rotating');
  const [scheduledAt, setScheduledAt] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          num_courts: numCourts,
          mode,
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
      router.push(`/game/${code}`);
    } catch {
      setError('Game not found. Check the join code and try again.');
    } finally {
      setLoading(false);
    }
  };

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
                Number of Courts
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumCourts(n)}
                    className={`flex-1 py-3 rounded-xl text-lg font-semibold transition-colors ${
                      numCourts === n
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
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
            {loading ? 'Joining...' : 'Join Game'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Or scan the QR code shared by the game creator
          </p>
        </div>
      </div>
    );
  }

  // Home view
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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
          <button onClick={() => setView('create')} className="btn-primary">
            Create New Game
          </button>
          <button onClick={() => setView('join')} className="btn-secondary">
            Join Existing Game
          </button>
        </div>

        <p className="text-sm text-gray-400 pt-4">
          Organize round robin tournaments with up to 14 players
        </p>
      </div>
    </div>
  );
}
