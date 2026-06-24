interface ViewTab {
  value: string;
  label: string;
}

interface ViewTabsProps {
  tabs: ViewTab[];
  value: string;
  onChange: (value: string) => void;
}

export function ViewTabs({ tabs, value, onChange }: ViewTabsProps) {
  return (
    <div className="flex gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-white/[0.06]">
      {tabs.map((tab) => {
        const is_active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              is_active
                ? 'bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
