'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { Group } from '@/lib/types';

export default function GroupJoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = (params.code as string).toUpperCase();

  const [group, setGroup] = useState<(Group & { member_count: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/group/join/${code}`);
    }
  }, [authLoading, user, router, code]);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${code}`);
      if (!res.ok) {
        setError('Group not found');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGroup(data);
      setLoading(false);
    } catch {
      setError('Failed to load group');
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (user) fetchGroup();
  }, [user, fetchGroup]);

  const joinGroup = async () => {
    if (!user) return;
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`/api/groups/${code}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already a member — redirect to group
          router.push(`/group/${code}`);
          return;
        }
        throw new Error(data.error);
      }
      router.push(`/group/${code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join group');
    } finally {
      setJoining(false);
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
        <p className="text-gray-500">Loading group...</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg">{error}</p>
          <button onClick={() => router.push('/')} className="text-primary-700 font-medium text-lg">
            &larr; Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const isFull = group.max_members ? group.member_count >= group.max_members : false;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => router.push('/')}
          className="text-primary-700 font-medium text-lg"
        >
          &larr; Home
        </button>

        <div className="card space-y-4 text-center">
          <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-500 mt-1">{group.description}</p>
            )}
          </div>

          <div className="flex justify-center gap-4 text-sm text-gray-500">
            <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
            {group.max_members && (
              <span>Max {group.max_members}</span>
            )}
          </div>

          <p className="font-mono text-lg font-bold text-primary-700 tracking-widest">{code}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {isFull ? (
          <div className="card text-center py-3 bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700 font-medium">This group is full</p>
          </div>
        ) : (
          <button
            onClick={joinGroup}
            disabled={joining}
            className="btn-primary"
          >
            {joining ? 'Joining...' : `Join Group as ${user.display_name}`}
          </button>
        )}
      </div>
    </div>
  );
}
