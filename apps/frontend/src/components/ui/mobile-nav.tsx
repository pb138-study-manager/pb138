import { Link } from '@tanstack/react-router';

export default function MobileNav() {
  return (
    <nav className="md:hidden bg-white shadow-sm border-b border-gray-200 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          <Link to="/tasks" className="text-xl font-bold text-indigo-600">
            PB138 Study Manager
          </Link>
        </div>
      </div>
    </nav>
  );
}
