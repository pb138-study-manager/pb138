import { mockRoles } from '@/components/admin/mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminRolesManager() {
  return (
    <div className="grid max-w-3xl gap-4">
      {mockRoles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-lg">{role.name}</CardTitle>
              <CardDescription>Permission bundles for RBAC.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" disabled>
              Edit mapping
            </Button>
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
