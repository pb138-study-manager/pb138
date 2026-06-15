import { createFileRoute } from '@tanstack/react-router';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminUsersManager } from '@/components/admin/admin-users-manager';

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <div>
      <AdminPageHeader
        title="Users"
        description="Manage accounts, roles, and access."
      />
      <AdminUsersManager />
    </div>
  );
}
