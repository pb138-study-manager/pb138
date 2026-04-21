import { ClipboardCheck, Clock, ClipboardList, Users } from 'lucide-react';

export default function BottomNav() {
  const items = [
    { icon: <ClipboardCheck />, label: 'Tasks', href: '/tasks' },
    { icon: <Clock />, label: 'Today', href: '/today' },
    { icon: <ClipboardList />, label: 'Notes', href: '/notes' },
    { icon: <Users />, label: 'Profile', href: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="flex flex-col items-center justify-center py-3 px-4 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <span className="text-xl mb-1">{item.icon}</span>
          <span className="text-xs font-medium">{item.label}</span>
        </a>
      ))}
    </div>
  );
}
