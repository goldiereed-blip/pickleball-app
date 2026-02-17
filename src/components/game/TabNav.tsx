'use client';

export type Tab = 'players' | 'divisions' | 'schedule' | 'scores' | 'rankings' | 'my-games';

interface TabNavProps {
  tabs: Tab[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabLabels: Record<Tab, string> = {
  players: 'Players',
  divisions: 'Divisions',
  schedule: 'Schedule',
  scores: 'Scores',
  rankings: 'Rankings',
  'my-games': 'My Games',
};

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="sticky top-0 z-10 bg-gray-50 px-4 py-2">
      <div className="max-w-lg mx-auto flex gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`tab-button ${activeTab === t ? 'tab-active' : 'tab-inactive'}`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>
    </nav>
  );
}
