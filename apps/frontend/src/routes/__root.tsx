import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import BottomNav from '@/components/ui/bottom-nav';
import Sidebar from '@/components/ui/sidebar';
import '@/lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { RoleModeProvider } from '@/lib/roleMode';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache data for 5 minutes without refetching
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify-email'];

function RootLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const hideNav = isPublicRoute;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, isLoading, isPublicRoute, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full
  animate-spin"
        />
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  const activeTab = pathname.startsWith('/today')
    ? 'today'
    : pathname.startsWith('/notes')
      ? 'notes'
      : pathname.startsWith('/timeline')
        ? 'timeline'
        : pathname.startsWith('/courses')
          ? 'courses'
          : pathname.startsWith('/profile') || pathname.startsWith('/custom-nav')
            ? 'profile'
            : pathname.startsWith('/others')
              ? 'others'
              : pathname.startsWith('/dashboard')
                ? 'dashboard'
                : pathname === '/teachers' || pathname.startsWith('/teachers/')
                  ? 'teachers'
                  : 'tasks';

  return (
    <QueryClientProvider client={queryClient}>
      <RoleModeProvider>
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
      </RoleModeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
