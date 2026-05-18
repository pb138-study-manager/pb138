import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminUser, AdminAuditLog, AdminRole, RoleName } from '@/types';

export function useAdminManager() {
  const queryClient = useQueryClient();
  const [userQuery, setUserQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');

  const { data: adminUsers = [], isPending: usersLoading } = useQuery({
    queryKey: ['admin-users', userQuery],
    queryFn: () =>
      api
        .get<AdminUser[]>(`/admin/users?q=${encodeURIComponent(userQuery)}`)
        .catch(() => []),
  });

  const { data: adminLogs = [], isPending: logsLoading } = useQuery({
    queryKey: ['admin-logs', logQuery],
    queryFn: () =>
      api
        .get<AdminAuditLog[]>(`/admin/audit-logs?q=${encodeURIComponent(logQuery)}`)
        .catch(() => []),
  });

  const { data: adminRoles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get<AdminRole[]>('/admin/roles').catch(() => []),
  });

  async function assignRole(userId: number, role: RoleName) {
    await api.patch(`/admin/users/${userId}/roles`, { add: [role] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  async function removeRole(userId: number, role: RoleName) {
    await api.patch(`/admin/users/${userId}/roles`, { remove: [role] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return {
    adminUsers,
    usersLoading,
    userQuery,
    setUserQuery,
    adminLogs,
    logsLoading,
    logQuery,
    setLogQuery,
    adminRoles,
    assignRole,
    removeRole,
  };
}
