'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface Stats {
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_percentage: number;
  total_points_for: number;
  total_points_against: number;
  avg_points_per_game: number;
}

interface GameWithStats {
  id: string;
  code: string;
  name: string;
  mode: string;
  scheduled_at: string | null;
  created_at: string;
  is_complete: number;
  started: number;
  player_name: string | null;
  is_creator: boolean;
  stats: {
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [games, setGames] = useState<GameWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7d' | '30d'>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, gamesRes] = await Promise.all([
          fetch(`/api/users/${user.id}/stats`),
          fetch(`/api/users/${user.id}/games`),
        ]);
        const [statsData, gamesData] = await Promise.all([
          statsRes.json(),
          gamesRes.json(),
        ]);
        setStats(statsData);
        setGames(gamesData);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  // Filter games by time
  const filteredGames = games.filter((g) => {
    if (filter === 'all') return true;
    const date = new Date(g.scheduled_at || g.created_at);
    const now = new Date();
    const days = filter === '7d' ? 7 : 30;
    return now.getTime() - date.getTime() < days * 24 * 60 * 60 * 1000;
  });

  const activeGames = filteredGames.filter((g) => !g.is_complete);
  const pastGames = filteredGames.filter((g) => g.is_complete);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{user.display_name}</h1>
            <p className="text-primary-200 text-sm">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="py-2 px-3 bg-primary-600 rounded-lg text-sm font-medium active:bg-primary-800"
            >
              Home
            </button>
            <button
              onClick={async () => { await logout(); router.push('/'); }}
              className="py-2 px-3 bg-primary-600 rounded-lg text-sm font-medium active:bg-primary-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {/* Career Stats */}
        {stats && (
          <div className="card">
            <h2 className="font-bold text-primary-700 mb-3">Career Stats</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary-700">{stats.total_games}</p>
                <p className="text-xs text-gray-500">Games</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary-700">{stats.total_wins}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary-700">{stats.win_percentage}%</p>
                <p className="text-xs text-gray-500">Win Rate</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-lg font-semibold">{stats.avg_points_per_game}</p>
                <p className="text-xs text-gray-500">Avg Pts/Game</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className={`text-lg font-semibold ${
                  stats.total_points_for - stats.total_points_against > 0
                    ? 'text-primary-600'
                    : stats.total_points_for - stats.total_points_against < 0
                    ? 'text-red-500'
                    : ''
                }`}>
                  {stats.total_points_for - stats.total_points_against > 0 ? '+' : ''}
                  {stats.total_points_for - stats.total_points_against}
                </p>
                <p className="text-xs text-gray-500">Point Diff</p>
              </div>
            </div>
          </div>
        )}

        {/* Time Filter */}
        <div className="flex gap-2">
          {(['all', '30d', '7d'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`tab-button ${filter === f ? 'tab-active' : 'tab-inactive'}`}
            >
              {f === 'all' ? 'All Time' : f === '30d' ? 'Last 30 Days' : 'Last 7 Days'}
            </button>
          ))}
        </div>

        {/* Active Games */}
        <div className="card">
          <h2 className="font-bold text-primary-700 mb-3">
            Active Games ({activeGames.length})
          </h2>
          {activeGames.length === 0 ? (
            <p className="text-sm text-gray-400">No active games</p>
          ) : (
            <div className="space-y-2">
              {activeGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/game/${g.code}`)}
                  className="w-full text-left bg-primary-50 rounded-lg p-3 active:bg-primary-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs text-gray-500">
                        {g.mode === 'rotating' ? 'Rotating' : 'Fixed'} partners
                        {g.player_name && ` — Playing as ${g.player_name}`}
                        {g.is_creator && ' — Admin'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p className="font-mono font-bold text-primary-700">{g.code}</p>
                      {g.scheduled_at && (
                        <p>{new Date(g.scheduled_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {(g.stats.wins + g.stats.losses) > 0 && (
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-primary-600">{g.stats.wins}W</span>
                      <span className="text-red-500">{g.stats.losses}L</span>
                      <span className="text-gray-500">
                        +{g.stats.points_for}/-{g.stats.points_against}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Past Games */}
        <div className="card">
          <h2 className="font-bold text-primary-700 mb-3">
            Past Games ({pastGames.length})
          </h2>
          {pastGames.length === 0 ? (
            <p className="text-sm text-gray-400">No completed games yet</p>
          ) : (
            <div className="space-y-2">
              {pastGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/game/${g.code}`)}
                  className="w-full text-left bg-gray-50 rounded-lg p-3 active:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs text-gray-500">
                        {g.player_name || 'Admin'}
                      </p>
                    </div>
                    <div className="text-right">
                      {(g.stats.wins + g.stats.losses) > 0 && (
                        <p className="text-sm font-semibold">
                          <span className="text-primary-600">{g.stats.wins}W</span>
                          {' - '}
                          <span className="text-red-500">{g.stats.losses}L</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(g.scheduled_at || g.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
