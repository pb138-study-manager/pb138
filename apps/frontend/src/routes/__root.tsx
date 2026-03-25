import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center">
            <Link to="/" className="text-xl font-bold text-indigo-600">
              PB138 Study Manager
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  ),
});
