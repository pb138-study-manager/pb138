import { createFileRoute } from '@tanstack/react-router';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminSettingsForm } from '@/components/admin/admin-settings-form';

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="System settings"
        description="Tune application-wide behaviour. Persist changes through your future PATCH /admin/settings endpoint."
      />
      <AdminSettingsForm />
    </div>
  );
}
