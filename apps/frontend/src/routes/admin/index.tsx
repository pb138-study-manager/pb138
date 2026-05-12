import type { ReactNode } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { mockAdminUsers, mockAuditLogs, mockRoles } from '@/components/admin/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileText, Shield, SlidersHorizontal, Users } from 'lucide-react';

export const Route = createFileRoute('/admin/')({
  component: AdminOverviewPage,
});

const tiles: {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    to: '/admin/settings',
    title: 'System settings',
    description: 'Feature flags, limits, and global preferences.',
    icon: <SlidersHorizontal className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/logs',
    title: 'System logs',
    description: 'Audit trail and security events.',
    icon: <FileText className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/database',
    title: 'Database',
    description: 'Health, backups, and operational tools.',
    icon: <Database className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/users',
    title: 'Users',
    description: 'Accounts, activation, and profile administration.',
    icon: <Users className="size-5 text-indigo-600" />,
  },
  {
    to: '/admin/roles',
    title: 'Roles',
    description: 'RBAC roles and permission bundles.',
    icon: <Shield className="size-5 text-indigo-600" />,
  },
];

function AdminOverviewPage() {
  return (
    <div>
      <AdminPageHeader
        title="Administration"
        description="Manage system configuration, review logs, and control access. All data on this page is mock UI until the admin API is connected."
      />
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{mockAdminUsers.length}</p>
            <p className="text-xs text-gray-500">mock directory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Log events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{mockAuditLogs.length}</p>
            <p className="text-xs text-gray-500">sample rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{mockRoles.length}</p>
            <p className="text-xs text-gray-500">defined roles</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="mt-0.5 rounded-lg bg-indigo-50 p-2">{t.icon}</div>
                <div>
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
