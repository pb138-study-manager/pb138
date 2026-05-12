import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminDatabasePanel() {
  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Database status</CardTitle>
          <CardDescription>
            Operational controls belong on the server. These actions are placeholders for future admin
            endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">PostgreSQL 16</Badge>
          <Badge variant="outline">Migrations: applied</Badge>
          <Badge className="bg-emerald-600">Last backup: 02:00 today (mock)</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>Do not run destructive operations from the browser in production.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline">
            Export schema SQL (mock)
          </Button>
          <Button type="button" variant="outline">
            Validate connections (mock)
          </Button>
          <Button type="button" variant="destructive" disabled>
            Reset demo data (disabled)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
