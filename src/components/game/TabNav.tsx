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
  'my-games': 'My Matches',
};

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
      <div className="max-w-lg mx-auto px-3 py-2 flex gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`shrink-0 min-w-[72px] py-2 px-3 text-sm font-semibold rounded-xl transition-colors ${
              activeTab === t
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-500 active:bg-gray-200'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>
    </nav>
  );
}
