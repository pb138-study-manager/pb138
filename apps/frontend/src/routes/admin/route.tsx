import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
