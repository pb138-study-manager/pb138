import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6 lg:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
