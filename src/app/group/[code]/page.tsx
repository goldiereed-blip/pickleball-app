'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { Group, GroupEvent, GroupMemberWithUser } from '@/lib/types';
import GroupHeader from '@/components/group/GroupHeader';
import MembersList from '@/components/group/MembersList';
import GroupEventsList from '@/components/group/GroupEventsList';
import { GroupShareModal, DeleteGroupModal, LeaveGroupModal, EditGroupModal, CreateEventModal, LastAdminModal } from '@/components/group/GroupModals';

type GroupTab = 'members' | 'upcoming' | 'active' | 'past';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = (params.code as string).toUpperCase();

  const [group, setGroup] = useState<(Group & { member_count: number }) | null>(null);
  const [members, setMembers] = useState<GroupMemberWithUser[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GroupEvent[]>([]);
  const [activeEvents, setActiveEvents] = useState<GroupEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<GroupTab>('members');

  // Modals
  const [showShare, setShowShare] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showLastAdmin, setShowLastAdmin] = useState(false);
  const [promotingMember, setPromotingMember] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, membersRes, upcomingRes, activeRes, pastRes] = await Promise.all([
        fetch(`/api/groups/${code}`),
        fetch(`/api/groups/${code}/members`),
        fetch(`/api/groups/${code}/events?status=upcoming`),
        fetch(`/api/groups/${code}/events?status=active`),
        fetch(`/api/groups/${code}/events?status=past`),
      ]);

      if (!groupRes.ok) {
        setError('Group not found');
        setLoading(false);
        return;
      }

      const [groupData, membersData, upcomingData, activeData, pastData] = await Promise.all([
        groupRes.json(),
        membersRes.json(),
        upcomingRes.json(),
        activeRes.json(),
        pastRes.json(),
      ]);

      setGroup(groupData);
      if (Array.isArray(membersData)) setMembers(membersData);
      if (Array.isArray(upcomingData)) setUpcomingEvents(upcomingData);
      if (Array.isArray(activeData)) setActiveEvents(activeData);
      if (Array.isArray(pastData)) setPastEvents(pastData);
      setLoading(false);
    } catch {
      setError('Failed to load group data');
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const joinUrl = `${window.location.origin}/group/join/${code}`;
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(joinUrl, {
          width: 256, margin: 2,
          color: { dark: '#5e3485', light: '#ffffff' },
        }).then(setQrDataUrl);
      });
    }
  }, [code]);

  const myMembership = members.find((m) => m.user_id === user?.id) || null;
  const isAdmin = myMembership?.role === 'admin';
  const isCreator = group?.created_by === user?.id;

  const shareLink = () => {
    const joinUrl = `${window.location.origin}/group/join/${code}`;
    if (navigator.share) {
      navigator.share({
        title: group?.name || 'Pickleball Group',
        text: `Join my pickleball group! Invite Code: ${code}`,
        url: joinUrl,
      });
    } else {
      navigator.clipboard?.writeText(joinUrl);
      alert('Invite link copied to clipboard!');
    }
  };

  const deleteGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete group');
    }
    setShowDelete(false);
  };

  const leaveGroup = async () => {
    if (!myMembership) return;
    try {
      const res = await fetch(`/api/groups/${code}/members/${myMembership.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'LAST_ADMIN') {
          setShowLeave(false);
          setShowLastAdmin(true);
          return;
        }
        throw new Error(data.error);
      }
      router.push('/');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to leave group');
    }
    setShowLeave(false);
  };

  const promoteAndLeave = async (memberId: string) => {
    if (!myMembership) return;
    setPromotingMember(true);
    try {
      await fetch(`/api/groups/${code}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      const res = await fetch(`/api/groups/${code}/members/${myMembership.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      router.push('/');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to leave group');
    } finally {
      setPromotingMember(false);
    }
  };

  const toggleAdmin = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      const res = await fetch(`/api/groups/${code}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      } else {
        fetchData();
      }
    } catch {
      alert('Failed to update role');
    }
  };

  const removeMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from the group?`)) return;
    try {
      const res = await fetch(`/api/groups/${code}/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      } else {
        fetchData();
      }
    } catch {
      alert('Failed to remove member');
    }
  };

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditMaxMembers(group.max_members ? String(group.max_members) : '');
    setShowEdit(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editName.trim()) body.name = editName.trim();
      body.description = editDescription.trim() || null;
      const maxNum = parseInt(editMaxMembers);
      body.max_members = !isNaN(maxNum) && maxNum >= 2 ? maxNum : null;

      const res = await fetch(`/api/groups/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      } else {
        setShowEdit(false);
        fetchData();
      }
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg">{error || 'Group not found'}</p>
          <button onClick={() => router.push('/')} className="text-primary-700 font-medium text-lg">
            &larr; Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!myMembership) {
    // Not a member — redirect to join page
    router.replace(`/group/join/${code}`);
    return null;
  }

  const tabs: { key: GroupTab; label: string; count?: number }[] = [
    { key: 'members', label: 'Members', count: members.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { key: 'active', label: 'Active', count: activeEvents.length },
    { key: 'past', label: 'Past', count: pastEvents.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <GroupHeader
        group={group}
        code={code}
        memberCount={group.member_count}
        isAdmin={isAdmin}
        isCreator={isCreator}
        onShare={() => setShowShare(true)}
        onDelete={() => setShowDelete(true)}
      />

      {/* Admin edit button */}
      {isAdmin && (
        <div className="max-w-lg mx-auto px-4 mt-2">
          <button
            onClick={openEdit}
            className="w-full py-2 bg-primary-50 text-primary-700 text-sm font-semibold rounded-xl border border-primary-200"
          >
            Edit Group Settings
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((t) => (
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
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 text-xs opacity-60">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {activeTab === 'members' && (
          <>
            <MembersList
              members={members}
              isAdmin={isAdmin}
              currentUserId={user.id}
              creatorId={group.created_by}
              onToggleAdmin={toggleAdmin}
              onRemoveMember={removeMember}
            />
            {!isCreator && (
              <button
                onClick={() => setShowLeave(true)}
                className="w-full py-2.5 text-sm text-red-600 font-medium bg-red-50 rounded-xl border border-red-200"
              >
                Leave Group
              </button>
            )}
          </>
        )}

        {activeTab === 'upcoming' && (
          <>
            {isAdmin && (
              <button
                onClick={() => setShowCreateEvent(true)}
                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary-700 text-white active:bg-primary-800"
              >
                + Create Event
              </button>
            )}
            <GroupEventsList
              events={upcomingEvents}
              emptyMessage={isAdmin ? 'No events scheduled yet — create one above' : 'No upcoming events — check back soon'}
              onUpdate={fetchData}
            />
          </>
        )}

        {activeTab === 'active' && (
          <GroupEventsList events={activeEvents} emptyMessage="No events currently in progress" />
        )}

        {activeTab === 'past' && (
          <GroupEventsList events={pastEvents} emptyMessage="No completed events yet" />
        )}
      </main>

      {/* Modals */}
      {showShare && (
        <GroupShareModal
          code={code}
          qrDataUrl={qrDataUrl}
          onShareLink={shareLink}
          onClose={() => setShowShare(false)}
        />
      )}

      {showDelete && group && (
        <DeleteGroupModal
          groupName={group.name}
          upcomingEventCount={upcomingEvents.length}
          onDelete={deleteGroup}
          onClose={() => setShowDelete(false)}
        />
      )}

      {showLeave && (
        <LeaveGroupModal
          onLeave={leaveGroup}
          onClose={() => setShowLeave(false)}
        />
      )}

      {showEdit && (
        <EditGroupModal
          name={editName}
          description={editDescription}
          maxMembers={editMaxMembers}
          onSave={saveEdit}
          onClose={() => setShowEdit(false)}
          onNameChange={setEditName}
          onDescriptionChange={setEditDescription}
          onMaxMembersChange={setEditMaxMembers}
          saving={saving}
        />
      )}

      {showCreateEvent && group && (
        <CreateEventModal
          group={group}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={(gameCode) => router.push(`/game/${gameCode}`)}
        />
      )}

      {showLastAdmin && group && (
        <LastAdminModal
          members={members}
          creatorId={group.created_by}
          onPromote={promoteAndLeave}
          onClose={() => setShowLastAdmin(false)}
          promoting={promotingMember}
        />
      )}
    </div>
  );
}
