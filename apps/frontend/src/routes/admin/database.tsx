import { createFileRoute } from '@tanstack/react-router';
import { AdminDatabasePanel } from '@/components/admin/admin-database-panel';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

export const Route = createFileRoute('/admin/database')({
  component: AdminDatabasePage,
});

function AdminDatabasePage() {
  return (
    <div>
      <AdminPageHeader
        title="Database"
        description="High-level status and guarded maintenance actions. Real operations must stay server-side."
      />
      <AdminDatabasePanel />
    </div>
  );
}
