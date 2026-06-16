import { useAdminManager } from '@/hooks/useAdminManager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminRolesManager() {
  const { adminRoles } = useAdminManager();

  return (
    <div className="grid max-w-3xl gap-4">
      {adminRoles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="space-y-0">
            <CardTitle className="text-lg">{role.name}</CardTitle>
            <CardDescription>Permission bundle for this role.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
