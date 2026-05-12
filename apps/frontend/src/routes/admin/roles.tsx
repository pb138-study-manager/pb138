import { createFileRoute } from '@tanstack/react-router';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminRolesManager } from '@/components/admin/admin-roles-manager';

export const Route = createFileRoute('/admin/roles')({
  component: AdminRolesPage,
});

function AdminRolesPage() {
  return (
    <div>
      <AdminPageHeader
        title="Roles"
        description="Map roles to permissions and keep segregation of duties clear for reviewers."
      />
      <AdminRolesManager />
    </div>
  );
}
