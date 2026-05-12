import { createFileRoute } from '@tanstack/react-router';
import { AdminLogsView } from '@/components/admin/admin-logs-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

export const Route = createFileRoute('/admin/logs')({
  component: AdminLogsPage,
});

function AdminLogsPage() {
  return (
    <div>
      <AdminPageHeader
        title="System logs"
        description="Immutable audit records help trace administrative actions and policy changes."
      />
      <AdminLogsView />
    </div>
  );
}
