import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import BottomNav from '@/components/ui/bottom-nav';
import Sidebar from '@/components/ui/sidebar';
import MobileNav from '@/components/ui/mobile-nav';

const AUTH_ROUTES = ['/login', '/register'];

function RootLayout() {
  const { pathname } = useLocation();
  const hideNav = AUTH_ROUTES.includes(pathname);

  const activeTab = (
    pathname.startsWith('/today')
      ? 'today'
      : pathname.startsWith('/notes')
        ? 'notes'
        : pathname.startsWith('/profile')
          ? 'profile'
          : 'tasks'
  ) as 'tasks' | 'today' | 'notes' | 'profile';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {!hideNav && (
        <>
          <MobileNav />
          <Sidebar activeTab={activeTab} />
        </>
      )}
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </main>
      {!hideNav && <BottomNav active={activeTab} />}
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
