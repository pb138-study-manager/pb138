import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import BottomNav from '@/components/ui/bottom-nav';
import Sidebar from '@/components/ui/sidebar';
import '@/lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache data for 5 minutes without refetching
      refetchOnWindowFocus: false,
    },
  },
});

const AUTH_ROUTES = ['/login', '/register'];

function RootLayout() {
  const { pathname } = useLocation();
  const hideNav = AUTH_ROUTES.includes(pathname);

  const activeTab = pathname.startsWith('/today')
    ? 'today'
    : pathname.startsWith('/notes')
      ? 'notes'
      : pathname.startsWith('/profile') || pathname.startsWith('/custom-nav')
        ? 'profile'
        : pathname.startsWith('/others')
          ? 'others'
          : pathname.startsWith('/dashboard')
            ? 'dashboard'
            : pathname.startsWith('/teachers')
              ? 'teachers'
              : 'tasks';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-full bg-gray-50 flex flex-col md:flex-row overflow-hidden">
        {!hideNav && (
          <>
            <Sidebar activeTab={activeTab} />
          </>
        )}
        <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0 h-full">
          <Outlet />
        </main>
        {!hideNav && <BottomNav active={activeTab} />}
      </div>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
