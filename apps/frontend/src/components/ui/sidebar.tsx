import { Link } from '@tanstack/react-router';
import { ClipboardCheck, Clock, ClipboardList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar({
  activeTab,
}: {
  activeTab: 'tasks' | 'today' | 'notes' | 'profile';
}) {
  const navItems = [
    { icon: <ClipboardCheck className="w-5 h-5" />, label: 'Tasks', href: '/tasks' },
    { icon: <Clock className="w-5 h-5" />, label: 'Today', href: '/today' },
    { icon: <ClipboardList className="w-5 h-5" />, label: 'Notes', href: '/notes' },
    { icon: <Users className="w-5 h-5" />, label: 'Profile', href: '/profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen z-10">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Link to="/tasks" className="text-xl font-bold text-indigo-600">
          Study Manager
        </Link>
      </div>
      <div className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium',
              activeTab === item.label.toLowerCase()
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
