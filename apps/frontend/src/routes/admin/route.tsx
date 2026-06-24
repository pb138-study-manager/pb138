import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ShieldOff } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import type { UserProfileResponse } from '@/hooks/useProfileManager';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: userData, isPending } = useQuery({
    queryKey: ['userMe'],
    queryFn: () => api.get<UserProfileResponse>('/users/me').catch(() => null),
  });

  if (isPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userData?.roles.includes('ADMIN')) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900 text-center px-4">
        <ShieldOff className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          You don&apos;t have permission to access the administration panel.
        </p>
        <Link
          to="/today"
          className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Go to App
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
