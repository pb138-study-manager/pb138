import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminUser, AdminAuditLog, AdminRole, RoleName } from '@/types';

const PAGE_SIZE = 50;

export function useAdminManager() {
  const queryClient = useQueryClient();
  const [userQuery, setUserQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [logQuery, setLogQuery] = useState('');
  const [logActor, setLogActor] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logType, setLogType] = useState<'all' | 'admin' | 'user'>('all');
  const [extraLogs, setExtraLogs] = useState<AdminAuditLog[]>([]);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);

  const { data: adminUsers = [], isPending: usersLoading } = useQuery({
    queryKey: ['admin-users', userQuery, showActiveOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userQuery) params.set('q', userQuery);
      if (showActiveOnly) params.set('activeOnly', 'true');
      return api.get<AdminUser[]>(`/admin/users?${params.toString()}`).catch(() => []);
    },
  });

  const buildLogsUrl = (offset: number) => {
    const params = new URLSearchParams();
    if (logQuery) params.set('q', logQuery);
    if (logActor) params.set('actor', logActor);
    if (logDateFrom) params.set('from', logDateFrom);
    if (logDateTo) params.set('to', logDateTo);
    if (logType !== 'all') params.set('type', logType);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return `/admin/audit-logs?${params.toString()}`;
  };

  const { data: initialLogs = [], isPending: logsLoading } = useQuery({
    queryKey: ['admin-logs', logQuery, logActor, logDateFrom, logDateTo, logType],
    queryFn: () => api.get<AdminAuditLog[]>(buildLogsUrl(0)).catch(() => []),
  });

  useEffect(() => {
    setExtraLogs([]);
    setHasMoreLogs(true);
  }, [logQuery, logActor, logDateFrom, logDateTo, logType]);

  const adminLogs = [...initialLogs, ...extraLogs];

  const loadMoreLogs = async () => {
    setLogsLoadingMore(true);
    try {
      const more = await api.get<AdminAuditLog[]>(buildLogsUrl(PAGE_SIZE + extraLogs.length));
      setExtraLogs((prev) => [...prev, ...more]);
      if (more.length < PAGE_SIZE) setHasMoreLogs(false);
    } catch {
      // ignore
    } finally {
      setLogsLoadingMore(false);
    }
  };

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

  async function deactivateUser(userId: number) {
    await api.delete(`/admin/users/${userId}`);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  async function reactivateUser(userId: number, restoreData = false) {
    await api.post(`/admin/users/${userId}/reactivate`, { restoreData });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  return {
    adminUsers,
    usersLoading,
    userQuery,
    setUserQuery,
    showActiveOnly,
    setShowActiveOnly,
    adminLogs,
    logsLoading,
    logsLoadingMore,
    hasMoreLogs,
    loadMoreLogs,
    logQuery,
    setLogQuery,
    logActor,
    setLogActor,
    logDateFrom,
    setLogDateFrom,
    logDateTo,
    setLogDateTo,
    logType,
    setLogType,
    adminRoles,
    assignRole,
    removeRole,
    deactivateUser,
    reactivateUser,
  };
}
