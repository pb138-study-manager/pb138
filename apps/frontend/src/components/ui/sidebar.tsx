import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ClipboardCheck,
  Clock,
  ClipboardList,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Sidebar({
  activeTab,
}: {
  activeTab: 'tasks' | 'today' | 'notes' | 'profile';
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { icon: <ClipboardCheck className="w-5 h-5 shrink-0" />, label: 'Tasks', href: '/tasks' },
    { icon: <Clock className="w-5 h-5 shrink-0" />, label: 'Today', href: '/today' },
    { icon: <ClipboardList className="w-5 h-5 shrink-0" />, label: 'Notes', href: '/notes' },
    { icon: <Users className="w-5 h-5 shrink-0" />, label: 'Profile', href: '/profile' },
  ];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white border-r border-gray-200 sticky top-0 h-screen z-10 transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-gray-200',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-6'
        )}
      >
        {!isCollapsed && (
          <Link to="/tasks" className="text-xl font-bold text-indigo-600 truncate">
            Study Manager
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
      <div className={cn('flex-1 py-6 space-y-2', isCollapsed ? 'px-3' : 'px-4')}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              'flex items-center rounded-lg transition-colors font-medium',
              isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5',
              activeTab === item.label.toLowerCase()
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}
